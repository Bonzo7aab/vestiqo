import { 
  Home, 
  Users, 
  Building2, 
  User, 
  LogIn, 
  LogOut, 
  Bookmark, 
  MessagesSquare, 
  Bell, 
  Play, 
  GraduationCap, 
  Settings,
  FileText,
  Plus,
  HelpCircle,
  Shield,
  Lock
} from 'lucide-react';
import { KONTO_DOKUMENTY_PATH } from './konto-tabs';

export interface SitemapEntry {
  category: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keywords: string[];
  requiresAuth?: boolean;
  userTypes?: ('manager' | 'contractor')[];
  shortcut?: string;
}

export const sitemapEntries: SitemapEntry[] = [
  // Główne
  {
    category: "Główne",
    label: "Strona główna",
    path: "/",
    icon: Home,
    description: "Przeglądaj ogłoszenia i oferty",
    keywords: ["home", "główna", "start", "strona główna", "ogłoszenia"]
  },
  {
    category: "Główne",
    label: "Wykonawcy",
    path: "/wykonawcy",
    icon: Users,
    description: "Przeglądaj profile wykonawców",
    keywords: ["wykonawcy", "contractors", "firmy", "usługi"]
  },
  {
    category: "Główne",
    label: "Zarządcy Nieruchomości",
    path: "/zarzadcy",
    icon: Building2,
    description: "Przeglądaj profile zarządców",
    keywords: ["zarządcy", "managers", "nieruchomości", "property"]
  },
  // Dla Wykonawców
  {
    category: "Dla Wykonawców",
    label: "Panel Wykonawcy",
    path: "/panel-wykonawcy",
    icon: User,
    description: "Zarządzaj swoimi ofertami i aplikacjami",
    keywords: ["panel", "dashboard", "wykonawca", "oferty", "aplikacje"],
    requiresAuth: true,
    userTypes: ['contractor']
  },
  // Dla Zarządców
  {
    category: "Dla Zarządców",
    label: "Panel Zarządcy",
    path: "/panel-zarzadcy",
    icon: Building2,
    description: "Zarządzaj swoimi ogłoszeniami i aplikacjami",
    keywords: ["panel", "dashboard", "zarządca", "ogłoszenia", "aplikacje"],
    requiresAuth: true,
    userTypes: ['manager']
  },
  {
    category: "Dla Zarządców",
    label: "Utwórz konkurs",
    path: "/dodaj-konkurs",
    icon: Plus,
    description: "Utwórz nowy konkurs ofert",
    keywords: ["konkurs", "tender", "utwórz", "nowy", "oferty", "zgłoszenie"],
    requiresAuth: true,
    userTypes: ['manager']
  },

  // Konto
  {
    category: "Konto",
    label: "Profil",
    path: "/konto",
    icon: User,
    description: "Zarządzaj swoim profilem",
    keywords: ["profil", "account", "ustawienia", "dane", "settings"],
    requiresAuth: true
  },
  {
    category: "Konto",
    label: "Zapisane Zgłoszenia",
    path: "/zapisane-zgloszenia",
    icon: Bookmark,
    description: "Przeglądaj zapisane zgłoszenia",
    keywords: ["zapisane", "saved", "bookmark", "zgłoszenia"],
    requiresAuth: true
  },
  {
    category: "Konto",
    label: "Wiadomości",
    path: "/wiadomosci",
    icon: MessagesSquare,
    description: "Sprawdź swoje wiadomości",
    keywords: ["wiadomości", "messages", "chat", "komunikacja"],
    requiresAuth: true
  },
  {
    category: "Konto",
    label: "Powiadomienia",
    path: "#",
    icon: Bell,
    description: "Ustawienia powiadomień",
    keywords: ["powiadomienia", "notifications", "alerty", "bell"],
    requiresAuth: true
  },

  // Pomoc
  {
    category: "Pomoc",
    label: "Strona Powitalna",
    path: "/powitanie",
    icon: Play,
    description: "Dowiedz się więcej o platformie",
    keywords: ["welcome", "powitalna", "start", "onboarding", "intro"]
  },
  {
    category: "Pomoc",
    label: "Tutorial",
    path: "/samouczek",
    icon: GraduationCap,
    description: "Przejdź przez samouczek platformy",
    keywords: ["tutorial", "samouczek", "nauka", "guide", "help"]
  },
  {
    category: "Pomoc",
    label: "Uzupełnij Profil",
    path: "/uzupelnianie-profilu",
    icon: Settings,
    description: "Dokończ konfigurację swojego profilu",
    keywords: ["profil", "completion", "uzupełnij", "konfiguracja"],
    requiresAuth: true
  },
  {
    category: "Pomoc",
    label: "Dokończ weryfikację",
    path: KONTO_DOKUMENTY_PATH,
    icon: Shield,
    description: "Prześlij dokumenty w zakładce Dokumenty na koncie",
    keywords: ["weryfikacja", "verification", "verify", "potwierdź", "dokończ", "dokumenty"],
    requiresAuth: true,
    userTypes: ['contractor'],
  },
  {
    category: "Pomoc",
    label: "Konsultacja Ekspercka",
    path: "/konsultacja-eksperta",
    icon: HelpCircle,
    description: "Skorzystaj z konsultacji eksperckiej",
    keywords: ["konsultacja", "ekspert", "expert", "consultation", "pomoc"]
  },

  // Autoryzacja
  {
    category: "Autoryzacja",
    label: "Zaloguj się",
    path: "/wybor-typu-konta",
    icon: LogIn,
    description: "Zaloguj się do swojego konta",
    keywords: ["login", "zaloguj", "logowanie", "sign in", "auth"],
    requiresAuth: false
  },
  {
    category: "Autoryzacja",
    label: "Rejestracja",
    path: "/rejestracja",
    icon: User,
    description: "Utwórz nowe konto",
    keywords: ["register", "rejestracja", "sign up", "nowe konto", "register"],
    requiresAuth: false
  },
  {
    category: "Autoryzacja",
    label: "Wyloguj się",
    path: "#",
    icon: LogOut,
    description: "Wyloguj się z konta",
    keywords: ["logout", "wyloguj", "sign out", "wyjście"],
    requiresAuth: true
  },
  {
    category: "Autoryzacja",
    label: "Przypomnij Hasło",
    path: "/zapomniane-haslo",
    icon: Lock,
    description: "Odzyskaj dostęp do konta",
    keywords: ["hasło", "password", "forgot", "reset", "odzyskaj"],
    requiresAuth: false
  }
];

export const getFilteredSitemap = (
  isAuthenticated: boolean, 
  userType?: 'manager' | 'contractor'
): SitemapEntry[] => {
  return sitemapEntries.filter(entry => {
    // Show public routes to everyone
    if (!entry.requiresAuth) {
      return true;
    }
    
    // Show authenticated routes only to authenticated users
    if (entry.requiresAuth && !isAuthenticated) {
      return false;
    }
    
    // Show role-specific routes only to users with matching role
    if (entry.userTypes && userType) {
      return entry.userTypes.includes(userType);
    }
    
    // Show general authenticated routes to all authenticated users
    return true;
  });
};

export const getSitemapByCategory = (entries: SitemapEntry[]) => {
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, SitemapEntry[]>);
  
  return grouped;
};
