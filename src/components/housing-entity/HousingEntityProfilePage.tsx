'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { fetchManagedHousingEntityById } from '../../lib/database/managed-housing-entities';
import {
  fetchPublicEntityContests,
  type PublicEntityContest,
} from '../../lib/database/public-entity-contests';
import type { ManagedHousingEntity } from '../../types/managed-housing-entity';
import { HousingEntityContestsTable } from './HousingEntityContestsTable';
import { HousingEntityProfileHeader } from './HousingEntityProfileHeader';

interface HousingEntityProfilePageProps {
  entityId: string;
}

export function HousingEntityProfilePage({
  entityId,
}: HousingEntityProfilePageProps): React.ReactElement {
  const [entity, setEntity] = useState<ManagedHousingEntity | null>(null);
  const [contests, setContests] = useState<PublicEntityContest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setNotFound(false);
      const supabase = createClient();

      const [entityResult, contestsResult] = await Promise.all([
        fetchManagedHousingEntityById(supabase, entityId),
        fetchPublicEntityContests(supabase, entityId),
      ]);

      if (cancelled) return;

      if (!entityResult.data) {
        setEntity(null);
        setContests([]);
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setEntity(entityResult.data);
      setContests(contestsResult.data);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-card border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !entity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Nie znaleziono profilu</h1>
          <p className="text-sm text-muted-foreground">
            Wspólnota lub spółdzielnia nie istnieje albo nie jest dostępna publicznie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HousingEntityProfileHeader entity={entity} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-6 border-b border-border" aria-label="Zakładki profilu">
          <span className="border-b-2 border-primary py-3 text-sm font-medium text-foreground">
            Konkursy
          </span>
        </nav>
        <div className="py-6">
          <HousingEntityContestsTable contests={contests} />
        </div>
      </div>
    </div>
  );
}
