/**
 * Test configuration constants
 */

// Test user email prefix - all test users will have emails starting with this
export const TEST_USER_PREFIX = 'test-playwright-';

// Test user credentials
export const TEST_USERS = {
  contractor: {
    email: `${TEST_USER_PREFIX}contractor-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Contractor',
    phone: '+48123456789',
    userType: 'contractor' as const,
  },
  manager: {
    email: `${TEST_USER_PREFIX}manager-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Manager',
    phone: '+48123456789',
    userType: 'manager' as const,
  },
};

// Pre-seeded manager for E2E flows (override via env in CI/other environments)
export const SEEDED_MANAGER = {
  email: process.env.E2E_SEEDED_MANAGER_EMAIL ?? 'zarzadca3@openpro.pl',
  password: process.env.E2E_SEEDED_MANAGER_PASSWORD ?? 'Test1!',
};

// Pre-seeded contractor for verification E2E flows
export const SEEDED_CONTRACTOR = {
  email: process.env.E2E_SEEDED_CONTRACTOR_EMAIL ?? 'wykonawca3@openpro.pl',
  password: process.env.E2E_SEEDED_CONTRACTOR_PASSWORD ?? 'Test1!',
};

// Route paths
export const ROUTES = {
  home: '/',
  login: '/logowanie',
  register: '/rejestracja',
  forgotPassword: '/zapomniane-haslo',
  contractorDashboard: '/panel-wykonawcy',
  managerDashboard: '/panel-zarzadcy',
  managerOrders: '/panel-zarzadcy/zamowienia',
  contractorOrders: '/panel-wykonawcy/zamowienia',
  account: '/konto',
  postContest: '/dodaj-konkurs',
  tenderCreation: '/tworzenie-przetargu',
  managerKonkursy: '/panel-zarzadcy/konkursy',
  contractorVerificationDocuments: '/konto?tab=dokumenty',
  adminVerification: '/administracja/weryfikacja',
} as const;

// Test timeouts (in milliseconds)
export const TIMEOUTS = {
  navigation: 10000,
  api: 5000,
  element: 5000,
} as const;



