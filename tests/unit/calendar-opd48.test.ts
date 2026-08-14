/**
 * OPD-48 calendar helpers
 * Run: npx tsx tests/unit/calendar-opd48.test.ts
 */
import assert from 'node:assert/strict';
import {
  addDays,
  addMonths,
  addMonthsToIsoDate,
  formatHourLabel,
  isDateInReminderWindow,
  monthGridDays,
  parseIsoDateLocal,
  parseWarrantyMonthsFromOfferDetails,
  formatWeekRange,
  headerNearestVisibleIsoDates,
  polishWeekdayShort,
  startOfIsoWeek,
  startOfMonth,
  toIsoDate,
  visibleHoursAroundEvents,
} from '../../src/lib/calendar/dates';
import {
  inspectionTypeToSubcategorySlug,
  subcategorySlugToFilterKey,
  subcategoryToInspectionType,
} from '../../src/lib/calendar/inspection-contest-map';
import {
  buildContestPrefillHref,
  parseContestPrefillSearchParams,
} from '../../src/lib/calendar/contest-prefill';
import {
  calendarEventStatus,
  filterCalendarEvents,
  groupEventsByDate,
  sortCalendarEvents,
  uniqueEventDueDates,
  selectHeaderNearestStrip,
  isManagerCalendarEventKind,
  type ManagerCalendarEvent,
} from '../../src/lib/calendar/manager-calendar-events';
import { selectDueReminders } from '../../src/lib/calendar/select-due-reminders';
import { buildInspectionReminderMessage } from '../../src/lib/calendar/reminder-copy';

assert.equal(addMonthsToIsoDate('2026-01-31', 1), '2026-02-28');
assert.equal(addMonthsToIsoDate('2026-08-13', 12), '2027-08-13');
assert.equal(toIsoDate('2026-08-13T14:22:00.000Z'), '2026-08-13');
assert.equal(isManagerCalendarEventKind('inspection'), true);
assert.equal(isManagerCalendarEventKind('custom'), true);
assert.equal(isManagerCalendarEventKind('unknown'), false);
assert.equal(toIsoDate(parseIsoDateLocal('2026-08-14')!), '2026-08-14');
assert.equal(parseIsoDateLocal('not-a-date'), null);
assert.equal(parseIsoDateLocal(''), null);

assert.equal(parseWarrantyMonthsFromOfferDetails({ warrantyMonths: 24 }), 24);
assert.equal(parseWarrantyMonthsFromOfferDetails({ guaranteeMonths: 36 }), 36);
assert.equal(parseWarrantyMonthsFromOfferDetails({ warrantyMonths: 12, guaranteeMonths: 36 }), 12);
assert.equal(parseWarrantyMonthsFromOfferDetails({}), null);
assert.equal(parseWarrantyMonthsFromOfferDetails(null), null);

assert.equal(inspectionTypeToSubcategorySlug('gas_annual'), 'przeglad-gazowy-roczny');
assert.equal(
  inspectionTypeToSubcategorySlug('chimney_ventilation_annual'),
  'przeglad-kominiarski-wentylacyjny-roczny',
);
assert.equal(subcategoryToInspectionType('przeglad-gazowy-roczny'), 'gas_annual');
assert.equal(subcategoryToInspectionType('Przegląd gazowy (roczny)'), 'gas_annual');
assert.equal(subcategoryToInspectionType('Remonty'), null);
assert.equal(subcategorySlugToFilterKey('przeglad-gazowy-roczny'), 'Przegląd gazowy (roczny)');

const today = new Date('2026-08-13T10:00:00');
assert.equal(isDateInReminderWindow('2026-09-12', today), true);
assert.equal(isDateInReminderWindow('2026-08-13', today), true);
assert.equal(isDateInReminderWindow('2026-08-12', today), false);
assert.equal(isDateInReminderWindow('2026-09-13', today), false);

const events: ManagerCalendarEvent[] = [
  {
    id: 'current',
    kind: 'contest',
    dueOn: '2026-12-01',
    status: calendarEventStatus('2026-12-01', today),
    title: 'Późny konkurs',
    entityName: 'A',
    entityId: 'e1',
    buildingName: null,
    buildingId: null,
    href: '/x',
    ctaHref: null,
    ctaLabel: null,
  },
  {
    id: 'overdue',
    kind: 'inspection',
    dueOn: '2026-07-01',
    status: calendarEventStatus('2026-07-01', today),
    title: 'Przegląd gazowy',
    entityName: 'B',
    entityId: 'e2',
    buildingName: 'Budynek A',
    buildingId: 'b1',
    href: '/y',
    ctaHref: '/dodaj-konkurs',
    ctaLabel: 'Uruchom konkurs',
  },
  {
    id: 'upcoming',
    kind: 'warranty',
    dueOn: '2026-08-20',
    status: calendarEventStatus('2026-08-20', today),
    title: 'Gwarancja',
    entityName: 'A',
    entityId: 'e1',
    buildingName: null,
    buildingId: null,
    href: '/z',
    ctaHref: '/dodaj-konkurs',
    ctaLabel: 'Nowy konkurs',
  },
  {
    id: 'nodate-excluded-source',
    kind: 'order',
    dueOn: '2026-08-20',
    status: calendarEventStatus('2026-08-20', today),
    title: 'Zamówienie',
    entityName: 'A',
    entityId: 'e1',
    buildingName: null,
    buildingId: null,
    href: '/o',
    ctaHref: '/o',
    ctaLabel: 'Otwórz',
  },
];

assert.equal(events[1]?.status, 'overdue');
assert.equal(events[2]?.status, 'upcoming');
assert.equal(events[0]?.status, 'current');

const sorted = sortCalendarEvents(events);
assert.equal(sorted[0]?.id, 'overdue');
assert.equal(sorted[1]?.kind, 'warranty');

const inspectionsOnly = filterCalendarEvents(events, { kind: 'inspection' });
assert.equal(inspectionsOnly.length, 1);
assert.equal(inspectionsOnly[0]?.id, 'overdue');

const byEntity = filterCalendarEvents(events, { entityId: 'e1' });
assert.ok(byEntity.every((event) => event.entityId === 'e1'));

const byDay = filterCalendarEvents(events, { dueOn: '2026-08-20' });
assert.equal(byDay.length, 2);
assert.deepEqual(uniqueEventDueDates(events).sort(), ['2026-07-01', '2026-08-20', '2026-12-01']);

const friday = new Date('2026-08-14T10:00:00');
const nearestVisible = headerNearestVisibleIsoDates(friday);
assert.equal(nearestVisible[1], '2026-08-14');
assert.deepEqual(nearestVisible, [
  '2026-08-13',
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
]);
assert.equal(polishWeekdayShort(friday), 'Pt');

const headerStrip = selectHeaderNearestStrip(events, friday);
assert.equal(headerStrip.lastPastEvent?.dueOn, '2026-07-01');
assert.equal(headerStrip.lastPastEvent?.id, 'overdue');
assert.equal(headerStrip.nextFutureEvent?.dueOn, '2026-08-20');
assert.equal(headerStrip.nextFutureEvent?.id, 'upcoming');

const withCloserPast: ManagerCalendarEvent[] = [
  ...events,
  {
    id: 'recent-past',
    kind: 'custom',
    dueOn: '2026-08-12',
    status: calendarEventStatus('2026-08-12', friday),
    title: 'Wczorajsze spotkanie',
    entityName: 'A',
    entityId: 'e1',
    buildingName: null,
    buildingId: null,
    href: '/past',
    ctaHref: null,
    ctaLabel: null,
  },
  {
    id: 'on-first-visible',
    kind: 'custom',
    dueOn: '2026-08-13',
    status: calendarEventStatus('2026-08-13', friday),
    title: 'Wczoraj w pasku',
    entityName: 'A',
    entityId: 'e1',
    buildingName: null,
    buildingId: null,
    href: '/visible',
    ctaHref: null,
    ctaLabel: null,
  },
];
const closerStrip = selectHeaderNearestStrip(withCloserPast, friday);
assert.equal(closerStrip.lastPastEvent?.id, 'recent-past');
assert.notEqual(closerStrip.lastPastEvent?.dueOn, '2026-08-13');
assert.ok(closerStrip.dayEvents.some((event) => event.id === 'on-first-visible'));
assert.equal(
  closerStrip.dayEvents.filter((event) => event.dueOn === '2026-08-13').length,
  1,
);

const thursday = new Date('2026-08-13T10:00:00');
const monday = startOfIsoWeek(thursday);
assert.equal(toIsoDate(monday), '2026-08-10');
assert.equal(monday.getDay(), 1);
assert.equal(toIsoDate(addDays(monday, 6)), '2026-08-16');
assert.equal(toIsoDate(startOfIsoWeek(new Date('2026-08-16T12:00:00'))), '2026-08-10');
assert.equal(toIsoDate(startOfIsoWeek(monday)), '2026-08-10');
assert.match(formatWeekRange(monday), /^10–16 /);

const august = startOfMonth(thursday);
assert.equal(toIsoDate(august), '2026-08-01');
assert.equal(toIsoDate(addMonths(august, 1)), '2026-09-01');
const grid = monthGridDays(august);
assert.equal(grid.length, 42);
assert.equal(toIsoDate(grid[0]!), '2026-07-27');
assert.equal(grid[0]!.getDay(), 1);
assert.equal(formatHourLabel(7), '07:00');
assert.deepEqual(visibleHoursAroundEvents([]), []);
assert.deepEqual(
  visibleHoursAroundEvents([{ startHour: 10 }, { startHour: null }, { startHour: 14 }]),
  [9, 10, 11, 13, 14, 15],
);
assert.deepEqual(visibleHoursAroundEvents([{ startHour: 0 }]), [0, 1]);
assert.deepEqual(visibleHoursAroundEvents([{ startHour: 23 }]), [22, 23]);

const customOnly = filterCalendarEvents(
  [
    ...events,
    {
      id: 'note',
      kind: 'custom',
      dueOn: '2026-08-14',
      status: calendarEventStatus('2026-08-14', today),
      title: 'Spotkanie',
      entityName: 'Moje wydarzenie',
      entityId: null,
      buildingName: null,
      buildingId: null,
      href: '/panel-zarzadcy/kalendarz',
      ctaHref: '/panel-zarzadcy/kalendarz',
      ctaLabel: null,
      startHour: 9,
    },
  ],
  { kind: 'custom' },
);
assert.equal(customOnly.length, 1);
assert.equal(customOnly[0]?.id, 'note');

const grouped = groupEventsByDate(events);
assert.equal(grouped[0]?.dueOn, '2026-07-01');
assert.equal(grouped[0]?.events[0]?.id, 'overdue');
assert.equal(grouped[1]?.dueOn, '2026-08-20');
assert.equal(grouped[1]?.events.length, 2);
assert.equal(grouped[1]?.events[0]?.kind, 'warranty');
assert.equal(grouped[1]?.events[1]?.kind, 'order');
assert.equal(grouped[2]?.dueOn, '2026-12-01');

const groupedFiltered = groupEventsByDate(filterCalendarEvents(events, { kind: 'inspection' }));
assert.equal(groupedFiltered.length, 1);
assert.equal(groupedFiltered[0]?.events[0]?.id, 'overdue');

const due = selectDueReminders(
  [
    {
      sourceKind: 'inspection',
      sourceId: 'i1',
      dueOn: '2026-09-12',
      companyId: 'c1',
      entityId: 'e1',
      entityName: 'Wilanów',
      buildingId: 'b1',
      buildingName: 'A',
      title: 'Przegląd gazowy (roczny)',
      actionUrl: '/dodaj-konkurs',
    },
    {
      sourceKind: 'warranty',
      sourceId: 'w1',
      dueOn: '2026-07-01',
      companyId: 'c1',
      entityId: 'e1',
      entityName: 'Wilanów',
      buildingId: null,
      buildingName: null,
      title: 'Remont dachu',
      actionUrl: '/panel-zarzadcy/zamowienia',
    },
    {
      sourceKind: 'inspection',
      sourceId: 'i2',
      dueOn: '2026-12-01',
      companyId: 'c1',
      entityId: 'e1',
      entityName: 'Wilanów',
      buildingId: 'b1',
      buildingName: 'A',
      title: 'Przegląd 5-letni',
      actionUrl: '/dodaj-konkurs',
    },
  ],
  today,
);
assert.equal(due.length, 1);
assert.equal(due[0]?.sourceId, 'i1');

const secondPass = selectDueReminders(due, today);
assert.equal(secondPass.length, 1);

const href = buildContestPrefillHref({
  entityId: 'ent-1',
  buildingId: 'bldg-1',
  subcategorySlug: 'przeglad-gazowy-roczny',
});
assert.ok(href.includes('entityId=ent-1'));
assert.ok(href.includes('buildingId=bldg-1'));
assert.ok(href.includes('subcategory=przeglad-gazowy-roczny'));

const parsed = parseContestPrefillSearchParams(
  new URLSearchParams(
    'entityId=ent-1&buildingId=bldg-1&subcategory=przeglad-gazowy-roczny',
  ),
);
assert.equal(parsed.entityId, 'ent-1');
assert.equal(parsed.buildingId, 'bldg-1');
assert.equal(parsed.categoryFilterKey, 'Przeglądy');
assert.equal(parsed.subcategoryFilterKey, 'Przegląd gazowy (roczny)');

const message = buildInspectionReminderMessage(
  'Przegląd gazowy (roczny)',
  'Wspólnota Wilanów',
  '2026-06-30',
);
assert.ok(message.includes('30.06.2026'));
assert.ok(message.includes('Przegląd gazowy (roczny)'));
assert.ok(message.includes('Wspólnota Wilanów'));

console.log('calendar-opd48.test.ts: ok');
