'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Star, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  getBookmarkedJobs,
  removeBookmark,
  type BookmarkedJob,
} from '../utils/bookmarkStorage';
import { toast } from 'sonner';
import JobCard from './JobCard';
import {
  bookmarkToListingJob,
  formatHousingEntityCountLabel,
  formatKonkursCountLabel,
  isContestBookmark,
  isHousingEntityBookmark,
} from '../lib/listing/bookmark-to-listing-job';
import { BOOKMARK_COUNT_CHANGED_EVENT } from '../utils/bookmarkCountOverrides';
import { useContractorContestBidStatus } from '../hooks/useContractorContestBidStatus';
import { routes } from '../lib/routes';

interface BookmarkedJobsPageProps {
  onBack: () => void;
  onJobSelect: (jobId: string) => void;
  /** When true, omits page title (contractor dashboard nav provides it). */
  embedded?: boolean;
}

export const BookmarkedJobsPage: React.FC<BookmarkedJobsPageProps> = ({
  onBack,
  onJobSelect,
  embedded = false,
}) => {
  const [contestBookmarks, setContestBookmarks] = useState<BookmarkedJob[]>([]);
  const [entityBookmarks, setEntityBookmarks] = useState<BookmarkedJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { submittedIds, draftIds, isLoading: isLoadingBidStatus } =
    useContractorContestBidStatus();

  const loadBookmarks = useCallback(() => {
    const all = getBookmarkedJobs();
    setContestBookmarks(all.filter(isContestBookmark));
    setEntityBookmarks(all.filter(isHousingEntityBookmark));
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadBookmarks());
    const sync = () => loadBookmarks();
    window.addEventListener('focus', sync);
    window.addEventListener(BOOKMARK_COUNT_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener(BOOKMARK_COUNT_CHANGED_EVENT, sync);
    };
  }, [loadBookmarks]);

  const filteredContestBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return contestBookmarks;
    const query = searchQuery.toLowerCase();
    return contestBookmarks.filter((bookmark) => {
      const locationStr =
        typeof bookmark.location === 'string'
          ? bookmark.location
          : [bookmark.location?.city, bookmark.location?.sublocality_level_1]
              .filter(Boolean)
              .join(', ');
      return (
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.company.toLowerCase().includes(query) ||
        locationStr.toLowerCase().includes(query)
      );
    });
  }, [contestBookmarks, searchQuery]);

  const filteredEntityBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return entityBookmarks;
    const query = searchQuery.toLowerCase();
    return entityBookmarks.filter((bookmark) => {
      const locationStr =
        typeof bookmark.location === 'string'
          ? bookmark.location
          : [bookmark.location?.city, bookmark.location?.sublocality_level_1]
              .filter(Boolean)
              .join(', ');
      return (
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.company.toLowerCase().includes(query) ||
        locationStr.toLowerCase().includes(query)
      );
    });
  }, [entityBookmarks, searchQuery]);

  const listingJobs = useMemo(
    () => filteredContestBookmarks.map(bookmarkToListingJob),
    [filteredContestBookmarks],
  );

  const handleRemoveBookmark = useCallback(
    (jobId: string, jobTitle: string, entityType: BookmarkedJob['entityType']) => {
      void removeBookmark(jobId, entityType).then(() => {
        window.dispatchEvent(new CustomEvent(BOOKMARK_COUNT_CHANGED_EVENT));
        loadBookmarks();
        toast.success(`Usunięto z zapisanych: ${jobTitle}`);
      });
    },
    [loadBookmarks],
  );

  const handleBookmarkToggle = useCallback(
    (jobId: string) => {
      const bookmark = contestBookmarks.find((b) => b.id === jobId);
      if (bookmark) {
        handleRemoveBookmark(jobId, bookmark.title, bookmark.entityType);
      }
    },
    [contestBookmarks, handleRemoveBookmark],
  );

  const contestCountLabel = formatKonkursCountLabel(contestBookmarks.length);
  const entityCountLabel = formatHousingEntityCountLabel(entityBookmarks.length);
  const hasAnyBookmarks = contestBookmarks.length > 0 || entityBookmarks.length > 0;
  const hasFilteredResults =
    filteredContestBookmarks.length > 0 || filteredEntityBookmarks.length > 0;

  return (
    <div className={embedded ? 'space-y-4' : 'min-h-screen bg-background'}>
      {!embedded && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="hidden md:flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Powrót
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Zapisane</h1>
                  <p className="text-sm text-muted-foreground">
                    {contestCountLabel}
                    {entityBookmarks.length > 0 ? ` · ${entityCountLabel}` : ''}
                  </p>
                </div>
              </div>
              <Star className="w-6 h-6 text-primary fill-primary" aria-hidden />
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? 'space-y-6' : 'container mx-auto px-4 py-6 space-y-6'}>
        {embedded && hasAnyBookmarks && (
          <p className="text-sm text-muted-foreground">
            {contestCountLabel}
            {entityBookmarks.length > 0 ? ` · ${entityCountLabel}` : ''}
          </p>
        )}

        {hasAnyBookmarks && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Szukaj w zapisanych…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {!hasAnyBookmarks ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Brak zapisanych pozycji</h3>
            <p className="text-muted-foreground mb-6">
              Nie masz jeszcze żadnych zapisanych konkursów ani wspólnot/spółdzielni.
            </p>
            <Button onClick={onBack}>Przeglądaj konkursy</Button>
          </div>
        ) : !hasFilteredResults ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Brak wyników</h3>
            <p className="text-muted-foreground">
              Nie znaleziono pozycji pasujących do wyszukiwania &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <>
            {filteredEntityBookmarks.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-base font-semibold">Wspólnoty i spółdzielnie</h2>
                <ul className="space-y-2">
                  {filteredEntityBookmarks.map((bookmark) => {
                    const locationStr =
                      typeof bookmark.location === 'string'
                        ? bookmark.location
                        : [bookmark.location?.city, bookmark.location?.sublocality_level_1]
                            .filter(Boolean)
                            .join(', ');
                    return (
                      <li
                        key={`entity-${bookmark.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <Link
                          href={routes.uzytkownik(bookmark.id)}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{bookmark.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {[bookmark.company, locationStr].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveBookmark(
                              bookmark.id,
                              bookmark.title,
                              'managed_housing_entity',
                            )
                          }
                          aria-label={`Usuń z zapisanych: ${bookmark.title}`}
                        >
                          <Star className="h-4 w-4 fill-current text-primary" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {filteredContestBookmarks.length > 0 ? (
              <section className="space-y-3">
                {filteredEntityBookmarks.length > 0 ? (
                  <h2 className="text-base font-semibold">Konkursy</h2>
                ) : null}
                <div className="space-y-2">
                  {listingJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isBookmarked
                      onClick={() => onJobSelect(job.id)}
                      onBookmark={handleBookmarkToggle}
                      onApplyClick={(jobId) => onJobSelect(jobId)}
                      hasSubmittedOffer={submittedIds.has(job.id)}
                      hasDraftOffer={draftIds.has(job.id)}
                      isCheckingOffer={isLoadingBidStatus}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
