'use server'

import { instrumentServerAction } from '../sentry/instrument-server-action'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getRegistrationSettingsForRegister } from '../database/platform-settings'
import { registrationClosedMessage } from '../registration-settings-shared'
import { sanitizeRedirectPath } from './redirectPath'
import { assertNotImpersonating, IMPERSONATION_READ_ONLY_ERROR } from './guard-impersonation'
import { isRedirectForbiddenForContractor } from './manager-contest-routes'
import { translateAuthErrorMessage, translateRegistrationErrorMessage, translateRegistrationInsertError, nipAlreadyRegisteredMessage, REGISTRATION_ERRORS } from './errorMessages'
import {
  isValidPolishPhone,
  normalizePolishPhone,
  POLISH_PHONE_INVALID_MESSAGE,
} from '../phone/polish-phone'
import { isValidNip, normalizeNip } from '../gus/nip'
import {
  checkEmailRegistrationStatus,
  checkNipRegistrationStatus,
} from './registration-checks'
import { getPublicAppOrigin } from './app-origin'
import { deleteUserAccountData } from './delete-user-account-data'
import { findAuthUserByEmail } from './find-user-by-email'
import { generateSecurePassword } from './generate-password'
import { validatePasswordStrength } from './password-policy'
import { sendPasswordResetEmail } from '../email/send-password-reset-email'
import { createAdminClientOrNull } from '../supabase/admin'
import * as Sentry from '@sentry/nextjs'
import {
  ACCOUNT_ROLES,
  isAccountRole,
  isRegistrationEntityType,
  resolveRegistrationAccountRole,
  resolveRegistrationCompanyType,
  resolveRegistrationOrganizationType,
  REGISTRATION_ENTITY_TYPES,
  type RegistrationEntityType,
  type SpoldzielniaSubRole,
  type WspolnotaSubRole,
} from '../profile/account-role-labels'
import { createManagedHousingEntity } from '../database/managed-housing-entities'
import {
  isDevQuickLoginAccountKey,
  isDevQuickLoginEnabled,
  isProductionSupabaseUrl,
} from './dev-quick-login'
import { getDevQuickLoginCredentials } from './dev-quick-login-credentials'

export interface LoginData {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  userType: 'manager' | 'contractor'
  phone?: string
  company?: string
  organizationType?: 'spółdzielnia' | 'wspólnota'
  nip?: string
  companyName?: string
  street?: string
  city?: string
  district?: string
  categories?: string[]
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  phone?: string
  profile_completed?: boolean
  onboarding_completed?: boolean
}

/**
 * Server Action for user login
 * Returns success/error and a role-correct redirect target so the client can navigate.
 */
async function loginActionImpl(
  formData: FormData
): Promise<{ success: true; redirectTo: string } | { error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const requestedRedirect = sanitizeRedirectPath(formData.get('redirectTo') as string | null, '')

  if (!email || !password) {
    return { error: 'Email i hasło są wymagane' }
  }

  try {
    const supabase = await createClient()

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: translateAuthErrorMessage(error.message) }
    }

    const userId = signInData.user?.id
    let redirectTo = '/'

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_type, platform_role')
        .eq('id', userId)
        .single()

      if (profileError) {
        return { error: translateAuthErrorMessage(profileError.message) }
      }

      const isAdmin = profile?.platform_role === 'platform_admin'
      const isContractor = profile?.user_type === 'contractor'

      const roleHome = isAdmin
        ? '/administracja'
        : isContractor
          ? '/panel-wykonawcy'
          : '/panel-zarzadcy'

      if (isAdmin) {
        // Admins always land on /administracja regardless of `redirectTo`.
        redirectTo = '/administracja'
      } else if (requestedRedirect) {
        const forbiddenForContractor =
          isContractor && isRedirectForbiddenForContractor(requestedRedirect)
        const forbiddenForManager =
          !isContractor &&
          (requestedRedirect.startsWith('/administracja') ||
            requestedRedirect.startsWith('/panel-wykonawcy'))

        redirectTo =
          forbiddenForContractor || forbiddenForManager ? roleHome : requestedRedirect
      } else {
        redirectTo = roleHome
      }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wystąpił błąd. Spróbuj ponownie.'
    return { error: translateAuthErrorMessage(message) }
  }
}

/**
 * One-click login for seeded vestiqo-test accounts (local + Preview only).
 */
async function devQuickLoginActionImpl(
  accountKey: string,
): Promise<{ success: true; redirectTo: string } | { error: string }> {
  if (!isDevQuickLoginEnabled()) {
    return { error: 'Szybkie logowanie jest dostępne tylko w środowisku developerskim.' }
  }

  if (isProductionSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return { error: 'Szybkie logowanie jest zablokowane dla bazy produkcyjnej.' }
  }

  if (!isDevQuickLoginAccountKey(accountKey)) {
    return { error: 'Nieznane konto testowe.' }
  }

  const { email, password } = getDevQuickLoginCredentials(accountKey)
  const formData = new FormData()
  formData.set('email', email)
  formData.set('password', password)
  return loginActionImpl(formData)
}

export type RegisterActionResult =
  | { success: true; redirectTo: string }
  | { error: string }

export type DeleteAccountActionResult = { success: true } | { error: string }

/**
 * Server Action for user registration
 * Creates auth user, user_profiles, companies, and user_companies.
 */
async function registerActionImpl(
  formData: FormData
): Promise<RegisterActionResult | void> {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const userType = formData.get('userType') as 'contractor' | 'manager'
  const phone = (formData.get('phone') as string)?.trim()
  const acceptTerms = formData.get('acceptTerms') as string
  const nip = (formData.get('nip') as string)?.trim()
  const companyName = (formData.get('companyName') as string)?.trim()
  const regon = (formData.get('regon') as string)?.trim() || null
  const gusAddress = (formData.get('address') as string)?.trim() || null
  const gusCity = (formData.get('city') as string)?.trim() || null
  const postalCode = (formData.get('postalCode') as string)?.trim() || null
  const bankAccountIban = (formData.get('bankAccountIban') as string)?.trim() || null
  const vatStatusRaw = (formData.get('vatStatus') as string)?.trim() || null
  const vatStatus =
    vatStatusRaw === 'active_vat' || vatStatusRaw === 'vat_exempt' ? vatStatusRaw : null
  const organizationTypeRaw = formData.get('organizationType') as string | null
  const accountRoleRaw = (formData.get('accountRole') as string | null)?.trim() || null
  const registrationEntityTypeRaw = (formData.get('registrationEntityType') as string | null)?.trim() || null
  const managedEntityNip = (formData.get('managedEntityNip') as string | null)?.trim() || null
  const managedEntityName = (formData.get('managedEntityName') as string | null)?.trim() || null
  const managedEntityRegon = (formData.get('managedEntityRegon') as string | null)?.trim() || null
  const managedEntityAddress = (formData.get('managedEntityAddress') as string | null)?.trim() || null
  const managedEntityCity = (formData.get('managedEntityCity') as string | null)?.trim() || null
  const managedEntityPostalCode = (formData.get('managedEntityPostalCode') as string | null)?.trim() || null
  const managedEntityBankAccountIban = (formData.get('managedEntityBankAccountIban') as string | null)?.trim() || null
  const managedEntityVatStatus = (formData.get('managedEntityVatStatus') as string | null)?.trim() || null

  let registrationEntityType: RegistrationEntityType | null = isRegistrationEntityType(
    registrationEntityTypeRaw,
  )
    ? registrationEntityTypeRaw
    : null

  if (!registrationEntityType) {
    registrationEntityType =
      userType === 'contractor'
        ? REGISTRATION_ENTITY_TYPES.WYKONAWCA
        : organizationTypeRaw === 'spółdzielnia'
          ? REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA
          : REGISTRATION_ENTITY_TYPES.WSPOLNOTA
  }

  const wspolnotaSubRole = (formData.get('wspolnotaSubRole') as WspolnotaSubRole | null) ?? null
  const spoldzielniaSubRole = (formData.get('spoldzielniaSubRole') as SpoldzielniaSubRole | null) ?? null

  const accountRole =
    isAccountRole(accountRoleRaw)
      ? accountRoleRaw
      : resolveRegistrationAccountRole(
          registrationEntityType,
          registrationEntityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA
            ? wspolnotaSubRole
            : registrationEntityType === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA
              ? spoldzielniaSubRole
              : null,
        )

  const organizationType =
    resolveRegistrationOrganizationType(registrationEntityType) ??
    (organizationTypeRaw === 'spółdzielnia' || organizationTypeRaw === 'wspólnota'
      ? organizationTypeRaw
      : null)
  if (!acceptTerms || acceptTerms === '0') {
    redirect(`/rejestracja?error=${encodeURIComponent('Musisz zaakceptować regulamin i politykę prywatności')}`)
  }

  if (!email || !password || !firstName || !lastName || !userType) {
    redirect(`/rejestracja?error=${encodeURIComponent('Proszę wypełnić wszystkie wymagane pola')}`)
  }

  if (!nip || !companyName) {
    redirect(`/rejestracja?error=${encodeURIComponent('Podaj prawidłowy NIP i poczekaj na pobranie nazwy firmy')}`)
  }

  if (accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER) {
    if (!managedEntityNip || !managedEntityName) {
      redirect(
        `/rejestracja?error=${encodeURIComponent('Podaj NIP wspólnoty i poczekaj na pobranie nazwy z rejestru GUS')}`,
      )
    }
    const normalizedManagedEntityNip = normalizeNip(managedEntityNip)
    if (!isValidNip(normalizedManagedEntityNip)) {
      return { error: 'Podaj prawidłowy numer NIP wspólnoty' }
    }
    if (normalizedManagedEntityNip === normalizeNip(nip)) {
      return { error: REGISTRATION_ERRORS.managementAndCommunityNipMustDiffer }
    }
  }

  if (!phone) {
    redirect(`/rejestracja?error=${encodeURIComponent('Telefon jest wymagany')}`)
  }

  if (!isValidPolishPhone(phone)) {
    redirect(`/rejestracja?error=${encodeURIComponent(POLISH_PHONE_INVALID_MESSAGE)}`)
  }

  const normalizedPhone = normalizePolishPhone(phone)

  const passwordCheck = validatePasswordStrength(password)
  if (!passwordCheck.valid) {
    redirect(`/rejestracja?error=${encodeURIComponent(passwordCheck.message ?? 'Nieprawidłowe hasło')}`)
  }

  if (password !== confirmPassword) {
    redirect(`/rejestracja?error=${encodeURIComponent('Hasła nie są identyczne')}`)
  }

  const registrationSettings = await getRegistrationSettingsForRegister()
  if (userType === 'contractor' && !registrationSettings.contractorOpen) {
    redirect(`/rejestracja?error=${encodeURIComponent(registrationClosedMessage('contractor'))}`)
  }
  if (userType === 'manager' && !registrationSettings.managerOpen) {
    redirect(`/rejestracja?error=${encodeURIComponent(registrationClosedMessage('manager'))}`)
  }

  const normalizedNip = normalizeNip(nip)
  if (!isValidNip(normalizedNip)) {
    return { error: 'Podaj prawidłowy numer NIP' }
  }

  let resolvedCompanyName = companyName
  let resolvedRegon = regon
  let resolvedAddress = gusAddress
  let resolvedCity = gusCity
  let resolvedPostalCode = postalCode

  if (!resolvedRegon || !resolvedCompanyName) {
    try {
      const { lookupByNip } = await import('../gus/lookup-by-nip')
      const gusData = await lookupByNip(normalizedNip)
      if (gusData) {
        resolvedRegon = resolvedRegon || gusData.regon
        resolvedCompanyName = resolvedCompanyName || gusData.name
        resolvedAddress = resolvedAddress || gusData.address
        resolvedCity = resolvedCity || gusData.city
        resolvedPostalCode = resolvedPostalCode || gusData.postalCode
      }
    } catch (error) {
      console.error('[registerAction] GUS company backfill failed', error)
    }
  }

  if (!resolvedCompanyName) {
    redirect(`/rejestracja?error=${encodeURIComponent('Podaj prawidłowy NIP i poczekaj na pobranie nazwy firmy')}`)
  }

  const { createAdminClient } = await import('../supabase/admin')
  const admin = createAdminClient()

  const emailStatus = await checkEmailRegistrationStatus(admin, email)
  if (emailStatus === 'taken') {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered }
  }
  if (emailStatus === 'unavailable') {
    return { error: REGISTRATION_ERRORS.duplicateCheckUnavailable }
  }

  const companyNipRole =
    accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER ? 'management' : 'company'

  const nipStatus = await checkNipRegistrationStatus(admin, normalizedNip)
  if (nipStatus === 'taken') {
    return { error: nipAlreadyRegisteredMessage(normalizedNip, companyNipRole) }
  }
  if (nipStatus === 'unavailable') {
    return { error: REGISTRATION_ERRORS.duplicateCheckUnavailable }
  }

  const normalizedManagedEntityNipForCheck =
    accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER && managedEntityNip
      ? normalizeNip(managedEntityNip)
      : null

  if (normalizedManagedEntityNipForCheck) {
    // Same NIP in both fields is rejected earlier; only check community NIP when it differs.
    if (normalizedManagedEntityNipForCheck !== normalizedNip) {
      const communityNipStatus = await checkNipRegistrationStatus(
        admin,
        normalizedManagedEntityNipForCheck,
      )
      if (communityNipStatus === 'taken') {
        return {
          error: nipAlreadyRegisteredMessage(normalizedManagedEntityNipForCheck, 'community'),
        }
      }
      if (communityNipStatus === 'unavailable') {
        return { error: REGISTRATION_ERRORS.duplicateCheckUnavailable }
      }
    }
  }

  const origin = getPublicAppOrigin();
  const confirmationMessage = encodeURIComponent('Adres email został potwierdzony.');
  const confirmationNext = `/?message=${confirmationMessage}`;
  const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(confirmationNext)}`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        phone: normalizedPhone,
      },
    },
  })

  if (authError) {
    return { error: translateRegistrationErrorMessage(authError.message) }
  }

  if (!authData.user) {
    return { error: 'Nie udało się utworzyć konta' }
  }

  if (authData.user.identities?.length === 0) {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered }
  }

  const userId = authData.user.id

  const { error: profileError } = await admin
    .from('user_profiles')
    .insert({
      id: userId,
      user_type: userType,
      first_name: firstName,
      last_name: lastName,
      phone: normalizedPhone || null,
      nip: normalizedNip,
      account_role: accountRole,
      organization_type: organizationType,
      is_verified: userType === 'manager',
      profile_completed: false,
      onboarding_completed: false,
    })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return {
      error: translateRegistrationInsertError(profileError.message, {
        nip: normalizedNip,
        role: companyNipRole,
      }),
    }
  }

  const companyType = resolveRegistrationCompanyType(accountRole)

  const companyPayload = {
    name: resolvedCompanyName,
    type: companyType,
    nip: normalizedNip || null,
    regon: resolvedRegon,
    address: resolvedAddress,
    city: resolvedCity || (userType === 'manager' ? 'Warszawa' : null),
    postal_code: resolvedPostalCode,
    country: 'PL',
    email: email,
    phone: normalizedPhone || null,
    is_verified: userType === 'manager',
    verification_level: userType === 'manager' ? ('verified' as const) : ('none' as const),
  }

  const { data: companyRow, error: companyError } = await admin
    .from('companies')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- companyPayload includes metadata, type not in DB schema
    .insert(companyPayload as any)
    .select('id')
    .single()

  if (companyError) {
    await admin.auth.admin.deleteUser(userId)
    return {
      error: translateRegistrationInsertError(companyError.message, {
        nip: normalizedNip,
        role: companyNipRole,
      }),
    }
  }

  if (!companyRow?.id) {
    redirect(`/rejestracja?error=${encodeURIComponent('Nie udało się utworzyć firmy')}`)
  }

  // user_companies not in Database type; use type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: ucError } = await (admin as any)
    .from('user_companies')
    .insert({
      user_id: userId,
      company_id: companyRow.id,
      role: 'owner',
      is_primary: true,
      is_active: true,
    })

  if (ucError) {
    redirect(`/rejestracja?error=${encodeURIComponent(ucError.message)}`)
  }

  if (accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER && managedEntityNip && managedEntityName) {
    const { error: managedEntityError } = await createManagedHousingEntity(admin, companyRow.id, {
      entity_type: 'wspólnota',
      nip: managedEntityNip,
      regon: managedEntityRegon ?? '',
      name: managedEntityName,
      address: managedEntityAddress ?? '',
      city: managedEntityCity ?? '',
      postal_code: managedEntityPostalCode ?? '',
      bank_account_iban: managedEntityBankAccountIban ?? '',
      vat_status: managedEntityVatStatus ?? '',
    })

    if (managedEntityError) {
      await admin.auth.admin.deleteUser(userId)
      const managedMessage = managedEntityError.message || 'Nie udało się zapisać danych wspólnoty'
      if (
        managedMessage.toLowerCase().includes('już na liście') ||
        managedMessage.toLowerCase().includes('nip')
      ) {
        return {
          error: nipAlreadyRegisteredMessage(
            normalizeNip(managedEntityNip),
            'community',
          ),
        }
      }
      return {
        error: translateRegistrationErrorMessage(managedMessage),
      }
    }
  }

  const { persistRegistrationFinanceSettings } = await import('./persist-registration-finance-settings')
  const financeResult = await persistRegistrationFinanceSettings(admin, {
    userId,
    normalizedNip,
    bankAccountIban,
    vatStatus,
  })

  if (!financeResult.persisted && financeResult.error) {
    console.error('[registerAction] finance settings persist failed', {
      userId,
      nip: normalizedNip,
      error: financeResult.error,
    })
  }

  if (userType === 'contractor') {
    const { syncRegistryFromNip } = await import('../registry/sync-registry-from-nip')
    const registryResult = await syncRegistryFromNip(admin, {
      userId,
      companyId: companyRow.id,
      normalizedNip,
    })
    if (!registryResult.ok) {
      console.error('[registerAction] registry sync failed', {
        userId,
        nip: normalizedNip,
        error: registryResult.error,
      })
    }
  }

  revalidatePath('/', 'layout')

  const successMessage = encodeURIComponent(
    'Konto zostało utworzone pomyślnie. Zostałeś automatycznie zalogowany.'
  )

  if (authData.session) {
    const redirectTo =
      userType === 'contractor'
        ? `/konto?tab=uslugi&onboarding=1`
        : `/panel-zarzadcy/konkursy?message=${successMessage}`
    return { success: true, redirectTo }
  }

  redirect(
    `/logowanie?message=${encodeURIComponent('Konto zostało utworzone pomyślnie. Sprawdź email aby potwierdzić konto.')}`
  )
}

/**
 * Server Action for user logout
 */
async function logoutActionImpl() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/logowanie?refresh_browser_auth=1')
}

/**
 * Server Action for updating user profile
 */
async function updateUserActionImpl(userData: UpdateUserData) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  try {
    await assertNotImpersonating(user.id)
  } catch {
    return { error: IMPERSONATION_READ_ONLY_ERROR }
  }

  const patch: UpdateUserData = {}

  if (userData.first_name !== undefined) {
    const firstName = userData.first_name.trim()
    if (!firstName) {
      return { error: 'Imię jest wymagane' }
    }
    patch.first_name = firstName
  }

  if (userData.last_name !== undefined) {
    const lastName = userData.last_name.trim()
    if (!lastName) {
      return { error: 'Nazwisko jest wymagane' }
    }
    patch.last_name = lastName
  }

  if (userData.phone !== undefined) {
    const phone = userData.phone.trim()
    if (!phone) {
      return { error: 'Telefon jest wymagany' }
    }
    if (!isValidPolishPhone(phone)) {
      return { error: POLISH_PHONE_INVALID_MESSAGE }
    }
    patch.phone = normalizePolishPhone(phone)
  }

  if (userData.profile_completed !== undefined) {
    patch.profile_completed = userData.profile_completed
  }

  if (userData.onboarding_completed !== undefined) {
    patch.onboarding_completed = userData.onboarding_completed
  }

  if (Object.keys(patch).length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(patch)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }
  
  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Generates a new temporary password, updates auth via admin API, and emails it via Resend.
 * Always returns success for valid emails (anti-enumeration).
 */
async function requestPasswordResetEmailActionImpl(
  email: string
): Promise<{ success: true } | { error: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: 'Podaj prawidłowy adres email' }
  }

  try {
    const admin = createAdminClientOrNull()
    if (!admin) {
      console.error('requestPasswordResetEmailAction: missing elevated Supabase key')
      return { success: true }
    }

    const user = await findAuthUserByEmail(admin, trimmed)
    if (!user) {
      return { success: true }
    }

    const newPassword = generateSecurePassword()
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      console.error('requestPasswordResetEmailAction: updateUserById failed', updateError.message)
      Sentry.captureException(updateError, { extra: { email: trimmed } })
      return { success: true }
    }

    const origin = getPublicAppOrigin()
    const sendResult = await sendPasswordResetEmail({
      toEmail: trimmed,
      password: newPassword,
      loginUrl: `${origin}/logowanie`,
    })

    if (!sendResult.sent) {
      console.error(
        'requestPasswordResetEmailAction: Resend failed',
        sendResult.skippedReason ?? 'unknown',
      )
      Sentry.captureMessage('Password reset email not sent', {
        extra: { email: trimmed, reason: sendResult.skippedReason },
      })
    }
  } catch (error) {
    console.error('requestPasswordResetEmailAction:', error)
    Sentry.captureException(error, { extra: { email: trimmed } })
  }

  return { success: true }
}

/**
 * Resends signup confirmation email with PKCE callback URL.
 */
async function resendConfirmationEmailActionImpl(
  email: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: 'Podaj prawidłowy adres email' };
  }

  const origin = getPublicAppOrigin();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: trimmed,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { error: translateRegistrationErrorMessage(error.message) };
  }

  return { success: true };
}

/**
 * Server Action for password reset (legacy name; same as request flow used on forgot-password).
 */
export async function resetPasswordAction(email: string) {
  return requestPasswordResetEmailAction(email)
}

/**
 * Server Action for deleting user account.
 * Removes linked company/NIP data, auth user, and profile.
 */
async function deleteAccountActionImpl(): Promise<DeleteAccountActionResult> {
  try {
    const supabase = await createClient()
    
    // First, verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'Not authenticated' }
    }

    try {
      await assertNotImpersonating(user.id)
    } catch {
      return { error: IMPERSONATION_READ_ONLY_ERROR }
    }

    const userId = user.id

    const { createAdminClient } = await import('../supabase/admin')
    const adminClient = createAdminClient()

    const dataCleanup = await deleteUserAccountData(adminClient, userId)
    if (dataCleanup.ok === false) {
      return { error: dataCleanup.error }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user account:', deleteError)
      console.error('Delete error details:', JSON.stringify(deleteError, null, 2))
      
      if (deleteError.message?.includes('not found') || deleteError.message?.includes('does not exist')) {
        return { error: 'Użytkownik nie został znaleziony.' }
      }
      
      if (deleteError.message?.includes('permission') || deleteError.message?.includes('unauthorized')) {
        return {
          error:
            'Brak uprawnień do usunięcia konta. Sprawdź konfigurację SUPABASE_SECRET_KEY lub SUPABASE_SERVICE_ROLE_KEY.',
        }
      }
      
      return { error: `Błąd bazy danych podczas usuwania użytkownika: ${deleteError.message || 'Nieznany błąd'}` }
    }

    // Safety net: profile row should already be gone after deleteUserAccountData.
    const { error: profileDeleteError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('Error deleting user profile after auth deletion:', profileDeleteError)
    }

    // Revalidate all paths to clear any cached user data
    revalidatePath('/', 'layout')
    
    // Clear local session cookies (user is already deleted server-side)
    await supabase.auth.signOut({ scope: 'local' })
    
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in deleteAccountAction:', error)
    
    // Handle missing service role key gracefully
    if (
      error instanceof Error &&
      (error.message?.includes('SUPABASE_SECRET_KEY') ||
        error.message?.includes('SUPABASE_SERVICE_ROLE_KEY') ||
        error.message?.includes('elevated API key'))
    ) {
      return {
        error:
          'Usuwanie konta nie jest skonfigurowane. Dodaj do pliku .env.local zmienną SUPABASE_SECRET_KEY (klucz tajny sb_secret_...) albo SUPABASE_SERVICE_ROLE_KEY (legacy JWT). Supabase → Settings → API Keys.',
      }
    }
    
    // Handle missing URL
    if (error instanceof Error && error.message?.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      return { 
        error: 'Brak konfiguracji Supabase URL. Sprawdź zmienne środowiskowe.' 
      }
    }
    
    return { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania konta' }
  }
}

export const loginAction = instrumentServerAction('loginAction', loginActionImpl)
export const devQuickLoginAction = instrumentServerAction(
  'devQuickLoginAction',
  devQuickLoginActionImpl,
)
export const registerAction = instrumentServerAction('registerAction', registerActionImpl)
export const logoutAction = instrumentServerAction('logoutAction', logoutActionImpl)
export const updateUserAction = instrumentServerAction('updateUserAction', updateUserActionImpl)
export const requestPasswordResetEmailAction = instrumentServerAction(
  'requestPasswordResetEmailAction',
  requestPasswordResetEmailActionImpl
)
export const resendConfirmationEmailAction = instrumentServerAction(
  'resendConfirmationEmailAction',
  resendConfirmationEmailActionImpl,
)
export const deleteAccountAction = instrumentServerAction('deleteAccountAction', deleteAccountActionImpl)
