'use server'

import { instrumentServerAction } from '../sentry/instrument-server-action'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getRegistrationSettingsForRegister } from '../database/platform-settings'
import { registrationClosedMessage } from '../registration-settings-shared'
import { sanitizeRedirectPath } from './redirectPath'
import { translateAuthErrorMessage, translateRegistrationErrorMessage, REGISTRATION_ERRORS } from './errorMessages'
import {
  isValidPolishPhone,
  normalizePolishPhone,
  POLISH_PHONE_INVALID_MESSAGE,
} from '../phone/polish-phone'
import { isValidNip, normalizeNip } from '../gus/nip'
import { isEmailAlreadyRegistered, isNipAlreadyRegistered } from './registration-checks'
import { getPublicAppOrigin } from './app-origin'
import { deleteUserAccountData } from './delete-user-account-data'

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
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const requestedRedirect = sanitizeRedirectPath(formData.get('redirectTo') as string | null, '')

  if (!email || !password) {
    return { error: 'Email i hasło są wymagane' }
  }

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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, platform_role')
      .eq('id', userId)
      .single()

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
        isContractor &&
        (requestedRedirect.startsWith('/panel-zarzadcy') ||
          requestedRedirect.startsWith('/administracja'))
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
  const organizationType =
    (formData.get('organizationType') as 'spółdzielnia' | 'wspólnota' | null) ?? 'wspólnota'
  if (!acceptTerms || acceptTerms === '0') {
    redirect(`/rejestracja?error=${encodeURIComponent('Musisz zaakceptować regulamin i politykę prywatności')}`)
  }

  if (!email || !password || !firstName || !lastName || !userType) {
    redirect(`/rejestracja?error=${encodeURIComponent('Proszę wypełnić wszystkie wymagane pola')}`)
  }

  if (!nip || !companyName) {
    redirect(`/rejestracja?error=${encodeURIComponent('Podaj prawidłowy NIP i poczekaj na pobranie nazwy firmy')}`)
  }

  if (!phone) {
    redirect(`/rejestracja?error=${encodeURIComponent('Telefon jest wymagany')}`)
  }

  if (!isValidPolishPhone(phone)) {
    redirect(`/rejestracja?error=${encodeURIComponent(POLISH_PHONE_INVALID_MESSAGE)}`)
  }

  const normalizedPhone = normalizePolishPhone(phone)

  if (password.length < 6) {
    redirect(`/rejestracja?error=${encodeURIComponent('Hasło musi mieć co najmniej 6 znaków')}`)
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

  const { createAdminClient } = await import('../supabase/admin')
  const admin = createAdminClient()

  if (await isNipAlreadyRegistered(admin, normalizedNip)) {
    return { error: REGISTRATION_ERRORS.nipAlreadyRegistered }
  }

  if (await isEmailAlreadyRegistered(admin, email)) {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered }
  }

  const origin = getPublicAppOrigin();
  const confirmationMessage = encodeURIComponent('Adres email został potwierdzony.');
  const confirmationNext =
    userType === 'contractor'
      ? `/rejestracja/wybor-weryfikacji?message=${confirmationMessage}`
      : `/konto?message=${confirmationMessage}`;
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
      is_verified: userType === 'manager',
      profile_completed: false,
      onboarding_completed: false,
    })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: translateRegistrationErrorMessage(profileError.message) }
  }

  const companyType: 'spółdzielnia' | 'wspólnota' | 'contractor' =
    userType === 'manager'
      ? (organizationType as 'spółdzielnia' | 'wspólnota')
      : 'contractor'

  const companyPayload = {
    name: companyName,
    type: companyType,
    nip: normalizedNip || null,
    regon,
    address: gusAddress,
    city: gusCity || (userType === 'manager' ? 'Warszawa' : null),
    postal_code: postalCode,
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
    const companyErrorMessage = companyError.message.toLowerCase()
    if (
      companyErrorMessage.includes('duplicate') ||
      companyErrorMessage.includes('unique')
    ) {
      return { error: REGISTRATION_ERRORS.nipAlreadyRegistered }
    }
    return { error: translateRegistrationErrorMessage(companyError.message) }
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

  const { persistRegistrationFinanceSettings } = await import('./persist-registration-finance-settings')
  await persistRegistrationFinanceSettings(admin, {
    userId,
    normalizedNip,
    bankAccountIban,
    vatStatus,
  })

  revalidatePath('/', 'layout')

  const successMessage = encodeURIComponent(
    'Konto zostało utworzone pomyślnie. Zostałeś automatycznie zalogowany.'
  )

  if (authData.session) {
    const redirectTo =
      userType === 'contractor'
        ? `/rejestracja/wybor-weryfikacji?message=${successMessage}`
        : `/konto?message=${successMessage}`
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

  const { error } = await supabase
    .from('user_profiles')
    .update(userData)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }
  
  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Sends Supabase password recovery email. Link lands on `/auth/confirm` then `/auth/aktualizacja-hasla`.
 */
async function requestPasswordResetEmailActionImpl(
  email: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: 'Podaj prawidłowy adres email' }
  }

  const origin = getPublicAppOrigin()
  const next = encodeURIComponent('/auth/aktualizacja-hasla')
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${origin}/auth/confirm?next=${next}`,
  })

  if (error) {
    return { error: error.message }
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
