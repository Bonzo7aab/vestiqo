export const MANAGER_DASHBOARD_TABS = [
  { id: 'konkursy', label: 'Konkursy', href: '/panel-zarzadcy/konkursy' },
  { id: 'zamowienia', label: 'Zamówienia', href: '/panel-zarzadcy/zamowienia' },
  { id: 'kalendarz', label: 'Kalendarz', href: '/panel-zarzadcy/kalendarz' },
  { id: 'ocena', label: 'Ocena', href: '/panel-zarzadcy/ocena' },
] as const;

export type ManagerDashboardTabId = (typeof MANAGER_DASHBOARD_TABS)[number]['id'];

export interface ManagerDashboardNavVisibility {
  showOrders?: boolean;
  showCalendar?: boolean;
}

export function getVisibleManagerDashboardTabs({
  showOrders = false,
  showCalendar = false,
}: ManagerDashboardNavVisibility = {}): Array<(typeof MANAGER_DASHBOARD_TABS)[number]> {
  return MANAGER_DASHBOARD_TABS.filter((tab) => {
    if (tab.id === 'zamowienia' && !showOrders) return false;
    if (tab.id === 'kalendarz' && !showCalendar) return false;
    return true;
  });
}
