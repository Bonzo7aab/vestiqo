/**
 * Registration error mapping (run: npx tsx tests/unit/registration-error-messages.test.ts)
 */
import assert from 'node:assert/strict';
import {
  REGISTRATION_ERRORS,
  matchesEmailUniqueConstraint,
  nipAlreadyRegisteredMessage,
  translateRegistrationErrorMessage,
  translateRegistrationInsertError,
} from '../../src/lib/auth/errorMessages';

assert.equal(
  translateRegistrationErrorMessage('User already registered'),
  REGISTRATION_ERRORS.emailAlreadyRegistered,
);

assert.equal(
  translateRegistrationErrorMessage(
    'A user with this email address has already been registered',
  ),
  REGISTRATION_ERRORS.emailAlreadyRegistered,
);

assert.equal(
  translateRegistrationInsertError(
    'duplicate key value violates unique constraint "companies_nip_key"',
    { nip: '9512616683' },
  ),
  nipAlreadyRegisteredMessage('9512616683', 'company'),
);

assert.equal(
  translateRegistrationInsertError(
    'duplicate key value violates unique constraint "companies_nip_key"',
    { nip: '9512616683', role: 'management' },
  ),
  nipAlreadyRegisteredMessage('9512616683', 'management'),
);

assert.equal(
  translateRegistrationInsertError(
    'duplicate key value violates unique constraint "companies_email_key"',
  ),
  REGISTRATION_ERRORS.emailAlreadyRegistered,
);

assert.equal(
  matchesEmailUniqueConstraint(
    'duplicate key value violates unique constraint "companies_email_key"',
  ),
  true,
);

assert.equal(
  matchesEmailUniqueConstraint(
    'duplicate key value violates unique constraint "companies_nip_key"',
  ),
  false,
);

assert.notEqual(
  translateRegistrationInsertError('duplicate key value violates unique constraint "companies_pkey"'),
  REGISTRATION_ERRORS.nipAlreadyRegistered,
);

assert.equal(
  translateRegistrationInsertError('duplicate key value violates unique constraint "companies_pkey"'),
  'Nie udało się utworzyć konta — konflikt danych. Sprawdź email i NIP albo spróbuj ponownie.',
);

assert.equal(
  nipAlreadyRegisteredMessage('951-261-66-83', 'company'),
  'NIP 9512616683 jest już zarejestrowany na platformie. Jeśli to Twoja firma, zaloguj się na istniejące konto.',
);

assert.equal(
  nipAlreadyRegisteredMessage('9512616683', 'management'),
  'NIP 9512616683 firmy zarządzającej jest już zarejestrowany na platformie. Zaloguj się na istniejące konto lub użyj innego NIP.',
);

assert.equal(
  nipAlreadyRegisteredMessage('1111111111', 'community'),
  'NIP 1111111111 wspólnoty jest już zarejestrowany na platformie. Zaloguj się na istniejące konto lub użyj innego NIP.',
);

console.log('registration-error-messages.test.ts: ok');
