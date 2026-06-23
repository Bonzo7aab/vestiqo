export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/** Validates password strength (OPD-114). */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`,
    };
  }

  const hasLetter = /[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(password);
  const hasDigit = /\d/.test(password);

  if (!hasLetter || !hasDigit) {
    return {
      valid: false,
      message: 'Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.',
    };
  }

  return { valid: true };
}
