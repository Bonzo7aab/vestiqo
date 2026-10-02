/**
 * Account menu sections (run: npx tsx tests/unit/account-menu-sections.test.ts)
 */
import assert from 'node:assert/strict';
import { buildAccountMenuSections } from '../../src/lib/account-menu-sections';

const handlers = {
  onAdminPanel: () => undefined,
  onAccount: () => undefined,
  onVerification: () => undefined,
  onZamowienia: () => undefined,
  onOffers: () => undefined,
  onZgloszenia: () => undefined,
  onBookmarkedJobs: () => undefined,
  onMessaging: () => undefined,
  onWelcome: () => undefined,
  onTutorial: () => undefined,
  onProfileCompletion: () => undefined,
};

const managerLabels = buildAccountMenuSections({
  isAdmin: false,
  userType: 'manager',
  showOrders: false,
  showVerificationAttention: false,
  verificationLabel: 'Weryfikacja',
  showProfileCompletion: false,
  handlers,
})
  .flatMap(section => section.items)
  .map(item => item.label);

assert.deepEqual(managerLabels, ['Konto', 'Konkursy']);

const pendingLabels = buildAccountMenuSections({
  isAdmin: false,
  userType: 'manager',
  showOrders: false,
  showVerificationAttention: false,
  verificationLabel: 'Weryfikacja',
  showProfileCompletion: false,
  managerAccessPending: true,
  handlers,
})
  .flatMap(section => section.items)
  .map(item => item.label);

assert.deepEqual(pendingLabels, []);

const pendingWithOrders = buildAccountMenuSections({
  isAdmin: false,
  userType: 'manager',
  showOrders: true,
  showVerificationAttention: false,
  verificationLabel: 'Weryfikacja',
  showProfileCompletion: false,
  managerAccessPending: true,
  handlers,
})
  .flatMap(section => section.items)
  .map(item => item.label);

assert.deepEqual(pendingWithOrders, ['Zamówienia']);

console.log('account-menu-sections tests passed');
