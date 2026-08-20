'use client';

import { Building2, Star, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useUserProfile } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabase/client';
import { routes } from '../../lib/routes';
import { formatManagedHousingEntityType } from '../../types/managed-housing-entity';
import type { PublicManagedHousingEntity } from '../../lib/database/public-managed-housing-entity';
import {
  addBookmark,
  isBookmarked,
  removeBookmark,
} from '../../utils/bookmarkStorage';
import { BOOKMARK_COUNT_CHANGED_EVENT } from '../../utils/bookmarkCountOverrides';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../ui/utils';

interface HousingEntityProfileHeaderProps {
  entity: PublicManagedHousingEntity;
}

export function HousingEntityProfileHeader({
  entity,
}: HousingEntityProfileHeaderProps): React.ReactElement {
  const router = useRouter();
  const { user } = useUserProfile();
  const [saved, setSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const sync = (): void => {
      setSaved(isBookmarked(entity.id, 'managed_housing_entity'));
    };
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener(BOOKMARK_COUNT_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener(BOOKMARK_COUNT_CHANGED_EVENT, sync);
    };
  }, [entity.id]);

  const typeLabel = formatManagedHousingEntityType(entity.entity_type);
  const initials = entity.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleToggleZapisane = useCallback(async () => {
    if (!user?.id) {
      router.push(
        `${routes.logowanie}?redirectTo=${encodeURIComponent(routes.uzytkownik(entity.id))}`,
      );
      return;
    }

    setIsToggling(true);
    try {
      const supabase = createClient();
      if (saved) {
        await removeBookmark(entity.id, 'managed_housing_entity', supabase, user.id);
        setSaved(false);
        toast.success('Usunięto z zapisanych');
      } else {
        await addBookmark(
          {
            id: entity.id,
            entityType: 'managed_housing_entity',
            title: entity.name,
            company: typeLabel,
            location: [entity.address, entity.city].filter(Boolean).join(', ') || '',
            postType: 'contest',
          },
          supabase,
          user.id,
        );
        setSaved(true);
        toast.success('Dodano do zapisanych');
      }
      window.dispatchEvent(new CustomEvent(BOOKMARK_COUNT_CHANGED_EVENT));
    } catch (error) {
      console.error('Housing entity bookmark toggle failed:', error);
      toast.error('Nie udało się zaktualizować zapisanych');
    } finally {
      setIsToggling(false);
    }
  }, [entity, router, saved, typeLabel, user?.id]);

  return (
    <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20">
                <AvatarFallback className="bg-primary text-white text-sm sm:text-lg md:text-xl">
                  {initials || <Building2 className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <button
                type="button"
                disabled={isToggling}
                onClick={() => void handleToggleZapisane()}
                className={cn(
                  'mb-1.5 -ml-0.5 inline-flex items-center gap-1 rounded-md py-0.5 pe-1.5 ps-0.5 text-xs font-medium transition-colors',
                  'text-muted-foreground hover:text-primary hover:bg-muted/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  'disabled:pointer-events-none disabled:opacity-50',
                  saved && 'text-primary',
                )}
                aria-pressed={saved}
                aria-label={saved ? 'Usuń z zapisanych' : 'Zapisz'}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    saved && 'fill-current text-primary',
                  )}
                  aria-hidden
                />
                <span>{saved ? 'Zapisano' : 'Zapisz'}</span>
              </button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-words mb-1.5 sm:mb-2">
                {entity.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" aria-hidden />
                  <span>{typeLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
