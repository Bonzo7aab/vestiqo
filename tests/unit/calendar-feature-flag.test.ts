/**
 * Calendar feature flag (run: npx tsx tests/unit/calendar-feature-flag.test.ts)
 */
import assert from 'node:assert/strict';
import { FLAGSHIP_FLAG_KEYS, TESTING_FEATURE_FLAG_KEYS } from '../../src/lib/flagship/keys';
import { getVisibleManagerDashboardTabs } from '../../src/components/manager-dashboard/manager-dashboard-nav-tabs';

{
  assert.equal(FLAGSHIP_FLAG_KEYS.CALENDAR, 'calendar');
  assert.equal(
    TESTING_FEATURE_FLAG_KEYS.includes(FLAGSHIP_FLAG_KEYS.CALENDAR),
    true,
  );
}

{
  const hidden = getVisibleManagerDashboardTabs();
  assert.equal(
    hidden.some((tab) => tab.id === 'kalendarz'),
    false,
  );
  assert.equal(
    hidden.some((tab) => tab.id === 'zamowienia'),
    false,
  );
}

{
  const visible = getVisibleManagerDashboardTabs({
    showOrders: true,
    showCalendar: true,
  });
  assert.deepEqual(
    visible.map((tab) => tab.id),
    ['konkursy', 'zamowienia', 'kalendarz', 'ocena'],
  );
}

{
  const calendarOnly = getVisibleManagerDashboardTabs({ showCalendar: true });
  assert.equal(
    calendarOnly.some((tab) => tab.id === 'kalendarz'),
    true,
  );
  assert.equal(
    calendarOnly.some((tab) => tab.id === 'zamowienia'),
    false,
  );
}

console.log('calendar-feature-flag.test.ts: ok');
