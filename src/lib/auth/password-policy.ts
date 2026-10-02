export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_MISMATCH_MESSAGE = 'Hasła nie są identyczne';
export const CONFIRM_PASSWORD_DEBOUNCE_MS = 400;

const LETTER_PATTERN = /[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const DIGIT_PATTERN = /\d/;

export type PasswordConstraintId = 'length' | 'letter' | 'digit';

export interface PasswordConstraint {
  id: PasswordConstraintId;
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export function getPasswordConstraints(password: string): PasswordConstraint[] {
  return [
    {
      id: 'length',
      label: `min. ${MIN_PASSWORD_LENGTH} znaków`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'letter',
      label: 'litera',
      met: LETTER_PATTERN.test(password),
    },
    {
      id: 'digit',
      label: 'cyfra',
      met: DIGIT_PATTERN.test(password),
    },
  ];
}

/** Validates password strength (OPD-114). */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`,
    };
  }

  const hasLetter = LETTER_PATTERN.test(password);
  const hasDigit = DIGIT_PATTERN.test(password);

  if (!hasLetter || !hasDigit) {
    return {
      valid: false,
      message: 'Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.',
    };
  }

  return { valid: true };
}
