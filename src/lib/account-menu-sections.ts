import type { LucideIcon } from 'lucide-react';
import {
  Bookmark,
  ClipboardList,
  GraduationCap,
  MessagesSquare,
  Package,
  Play,
  Star,
  User,
} from 'lucide-react';
import type { AccountMenuSection } from '../components/account/AccountMenuPanel';

interface AccountMenuHandlers {
  onAdminPanel: () => void;
  onAccount: () => void;
  onVerification: () => void;
  onZamowienia: () => void;
  onOffers: () => void;
  onZgloszenia: () => void;
  onBookmarkedJobs: () => void;
  onMessaging: () => void;
  onWelcome: () => void;
  onTutorial: () => void;
  onProfileCompletion: () => void;
}

interface BuildAccountMenuSectionsOptions {
  isAdmin: boolean;
  userType?: 'contractor' | 'manager' | string;
  showOrders: boolean;
  showVerificationAttention: boolean;
  verificationLabel: string;
  showProfileCompletion: boolean;
  /** Hide Konto / Konkursy while a manager waits for email + admin approval. */
  managerAccessPending?: boolean;
  handlers: AccountMenuHandlers;
}

function item(
  label: string,
  icon: LucideIcon,
  onClick: () => void,
  variant?: 'default' | 'attention',
): AccountMenuSection['items'][number] {
  return { label, icon, onClick, variant };
}

export function buildAccountMenuSections({
  isAdmin,
  userType,
  showOrders,
  showVerificationAttention,
  verificationLabel,
  showProfileCompletion,
  managerAccessPending = false,
  handlers,
}: BuildAccountMenuSectionsOptions): AccountMenuSection[] {
  if (isAdmin) {
    return [
      {
        items: [item('Panel administracyjny', User, handlers.onAdminPanel)],
      },
    ];
  }

  if (userType === 'contractor') {
    const items = [item('Konto', User, handlers.onAccount)];
    if (showVerificationAttention) {
      items.push({
        label: verificationLabel,
        icon: User,
        onClick: handlers.onVerification,
        variant: 'attention',
      });
    }
    if (showOrders) {
      items.push(item('Zamówienia', Package, handlers.onZamowienia));
    }
    items.push(item('Oferty', Bookmark, handlers.onOffers));
    return [{ items }];
  }

  if (userType === 'manager') {
    const items = managerAccessPending ? [] : [item('Konto', User, handlers.onAccount)];
    if (showOrders) {
      items.push(item('Zamówienia', Package, handlers.onZamowienia));
    }
    if (!managerAccessPending) {
      items.push(item('Konkursy', ClipboardList, handlers.onZgloszenia));
    }
    return items.length > 0 ? [{ items }] : [];
  }

  const mainItems = [
    item('Profil', User, handlers.onAccount),
    item('Zapisane zgłoszenia', Star, handlers.onBookmarkedJobs),
    item('Wiadomości', MessagesSquare, handlers.onMessaging),
  ];

  const helpItems = [
    item('Strona powitalna', Play, handlers.onWelcome),
    item('Tutorial', GraduationCap, handlers.onTutorial),
  ];
  if (showProfileCompletion) {
    helpItems.push(item('Uzupełnij profil', User, handlers.onProfileCompletion));
  }

  return [
    { items: mainItems },
    { label: 'Pomoc i nauka', items: helpItems },
  ];
}
