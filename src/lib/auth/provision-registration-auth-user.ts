import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { isAuthUserEmailConfirmed } from './email-confirmation';
import { REGISTRATION_ERRORS } from './errorMessages';
import { findAuthUserByEmail } from './find-user-by-email';

export interface RegistrationAuthMetadata {
  first_name: string;
  last_name: string;
  user_type: 'contractor' | 'manager';
  phone: string | null;
}

export type ProvisionRegistrationAuthResult =
  | { userId: string; session: Session | null }
  | { error: string };

interface ProvisionRegistrationAuthUserInput {
  admin: SupabaseClient<Database>;
  userClient: SupabaseClient<Database>;
  email: string;
  password: string;
  metadata: RegistrationAuthMetadata;
  emailRedirectTo: string;
}

/**
 * Creates a confirmed auth user without GoTrue's built-in confirmation mailer.
 * `signUp` on Confirm-email projects sends mail on every attempt; the default
 * SMTP quota is ~2/hour for the whole project (OPD-171 rate-limit false alarm).
 */
export async function provisionRegistrationAuthUser(
  input: ProvisionRegistrationAuthUserInput,
): Promise<ProvisionRegistrationAuthResult> {
  const existing = await findAuthUserByEmail(input.admin, input.email);

  if (existing && isAuthUserEmailConfirmed(existing)) {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered };
  }

  if (existing && !isAuthUserEmailConfirmed(existing)) {
    const recovered = await confirmExistingUser(input.admin, existing.id, input.password);
    if (recovered) {
      return signInOrReturnUser(input.userClient, input.email, input.password, existing.id);
    }
  }

  const created = await createConfirmedUser(input.admin, input);
  if (created) {
    return signInOrReturnUser(input.userClient, input.email, input.password, created);
  }

  const afterCreateAttempt = await findAuthUserByEmail(input.admin, input.email);
  if (afterCreateAttempt && !isAuthUserEmailConfirmed(afterCreateAttempt)) {
    const recovered = await confirmExistingUser(
      input.admin,
      afterCreateAttempt.id,
      input.password,
    );
    if (recovered) {
      return signInOrReturnUser(
        input.userClient,
        input.email,
        input.password,
        afterCreateAttempt.id,
      );
    }
  }
  if (afterCreateAttempt && isAuthUserEmailConfirmed(afterCreateAttempt)) {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered };
  }

  return signUpFallback(input, existing ?? afterCreateAttempt);
}

async function createConfirmedUser(
  admin: SupabaseClient<Database>,
  input: ProvisionRegistrationAuthUserInput,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.metadata,
  });

  if (error || !data.user) {
    console.error('[provisionRegistrationAuthUser] createUser failed:', error?.message);
    return null;
  }

  return data.user.id;
}

async function confirmExistingUser(
  admin: SupabaseClient<Database>,
  userId: string,
  password: string,
): Promise<boolean> {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('[provisionRegistrationAuthUser] confirm leftover user failed:', error.message);
    return false;
  }

  return true;
}

async function signInOrReturnUser(
  userClient: SupabaseClient<Database>,
  email: string,
  password: string,
  userId: string,
): Promise<ProvisionRegistrationAuthResult> {
  const { data, error } = await userClient.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[provisionRegistrationAuthUser] sign-in failed:', error.message);
  }

  return { userId, session: data?.session ?? null };
}

async function signUpFallback(
  input: ProvisionRegistrationAuthUserInput,
  existing: User | null,
): Promise<ProvisionRegistrationAuthResult> {
  const { data, error } = await input.userClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.emailRedirectTo,
      data: input.metadata,
    },
  });

  if (error) {
    const recoveredId = existing?.id ?? (await findAuthUserByEmail(input.admin, input.email))?.id;
    if (recoveredId) {
      const confirmed = await confirmExistingUser(input.admin, recoveredId, input.password);
      if (confirmed) {
        return signInOrReturnUser(input.userClient, input.email, input.password, recoveredId);
      }
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Nie udało się utworzyć konta' };
  }

  if (data.user.identities?.length === 0) {
    return { error: REGISTRATION_ERRORS.emailAlreadyRegistered };
  }

  const session = data.session;
  if (!session) {
    const confirmed = await confirmExistingUser(input.admin, data.user.id, input.password);
    if (confirmed) {
      return signInOrReturnUser(input.userClient, input.email, input.password, data.user.id);
    }
  }

  return { userId: data.user.id, session };
}
