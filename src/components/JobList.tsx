import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, Star, Map } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Toggle } from './ui/toggle';
import { Label } from './ui/label';
import JobCard from './JobCard';
import type { FilterState } from '../lib/filters/filter-state';
import { getBookmarkedJobs, addBookmark, removeBookmark } from '../utils/bookmarkStorage';
import { resolveBookmarkEntityType } from '../lib/bookmark/resolve-entity-type';
import {
  BOOKMARK_COUNT_CHANGED_EVENT,
  readBookmarkCountOverrides,
} from '../utils/bookmarkCountOverrides';
import { isJobExpired } from '../utils/jobHelpers';
import {
  jobMatchesFilters,
  matchesFavoritesFilter,
  getJobDeadline,
  getJobOfferCount,
  getJobCreatedTime,
} from '../lib/filters/filter-logic';
import { useUserProfile } from '../contexts/AuthContext';
import { useContractorContestBidStatus } from '../hooks/useContractorContestBidStatus';
import type { Job } from '../types/job';
import { cn } from './ui/utils';
import { AnimatedList } from './ui/animated-list';

interface JobListProps {
  jobs?: Job[];
  filters?: FilterState;
  onFilterChange?: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
  onJobSelect?: (jobId: string) => void;
  onToggleMap?: () => void;
  isMapVisible?: boolean;
  isLoadingJobs?: boolean;
  onApplyClick?: (jobId: string, jobData?: Job) => void;
}

export default function JobList({
  jobs: jobsProp,
  filters,
  onFilterChange,
  onJobSelect,
  onToggleMap,
  isMapVisible = false,
  isLoadingJobs = false,
  onApplyClick,
}: JobListProps) {
  const { user } = useUserProfile();
  const isManager = user?.userType === 'manager';
  const { submittedIds, draftIds, isLoading: isLoadingBidStatus } =
    useContractorContestBidStatus();
  const [sortBy, setSortBy] = useState('newest');
  const [bookmarkedJobs, setBookmarkedJobs] = useState<string[]>([]);
  const [bookmarkCountUpdates, setBookmarkCountUpdates] = useState<Record<string, number>>({});
  const [viewCountUpdates, setViewCountUpdates] = useState<Record<string, number>>({});

  useEffect(() => {
    queueMicrotask(() => {
      setBookmarkedJobs(getBookmarkedJobs().map((b) => b.id));
      setBookmarkCountUpdates(readBookmarkCountOverrides());
      try {
        const stored = sessionStorage.getItem('view-count-updates');
        setViewCountUpdates(stored ? JSON.parse(stored) : {});
      } catch {
        setViewCountUpdates({});
      }
    });
  }, []);

  useEffect(() => {
    const syncBookmarkCounts = () => {
      setBookmarkCountUpdates(readBookmarkCountOverrides());
    };
    const syncBookmarks = () => {
      syncBookmarkCounts();
      try {
        const bookmarks = getBookmarkedJobs();
        setBookmarkedJobs(bookmarks.map((b) => b.id));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(BOOKMARK_COUNT_CHANGED_EVENT, syncBookmarks);
    window.addEventListener('focus', syncBookmarks);
    return () => {
      window.removeEventListener(BOOKMARK_COUNT_CHANGED_EVENT, syncBookmarks);
      window.removeEventListener('focus', syncBookmarks);
    };
  }, []);

  useEffect(() => {
    const loadBookmarks = () => {
      try {
        const bookmarks = getBookmarkedJobs();
        setBookmarkedJobs(bookmarks.map((b) => b.id));
        setBookmarkCountUpdates(readBookmarkCountOverrides());
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };
    loadBookmarks();
    window.addEventListener('focus', loadBookmarks);
    return () => window.removeEventListener('focus', loadBookmarks);
  }, []);

  const effectiveBookmarkCounts = useMemo(() => {
    const merged = { ...bookmarkCountUpdates };
    if (!jobsProp?.length) return merged;
    for (const job of jobsProp) {
      const serverCount = ('bookmarks_count' in job ? job.bookmarks_count : 0) as number;
      const optimisticCount = bookmarkCountUpdates[job.id];
      if (optimisticCount !== undefined) {
        merged[job.id] = optimisticCount;
      }
    }
    return merged;
  }, [jobsProp, bookmarkCountUpdates]);

  const availableJobs = useMemo(() => {
    const jobs = jobsProp || [];
    return jobs.map((job) => {
      let updatedJob = { ...job };
      const bookmarkCountUpdate = effectiveBookmarkCounts[job.id];
      if (bookmarkCountUpdate !== undefined) {
        updatedJob = { ...updatedJob, bookmarks_count: bookmarkCountUpdate };
      }
      const viewCountUpdate = viewCountUpdates[job.id];
      if (viewCountUpdate !== undefined) {
        updatedJob = {
          ...updatedJob,
          visits_count: viewCountUpdate,
          metrics: { ...updatedJob.metrics, visits: viewCountUpdate },
        };
      }
      return updatedJob;
    });
  }, [jobsProp, effectiveBookmarkCounts, viewCountUpdates]);

  const handleBookmark = (jobId: string) => {
    const job = availableJobs.find((j) => j.id === jobId);
    if (!job) return;

    const isCurrentlyBookmarked = bookmarkedJobs.includes(jobId);
    const currentCount = ('bookmarks_count' in job ? job.bookmarks_count : 0) as number;

    const entityType = resolveBookmarkEntityType({
      postType: job.postType,
      contestInfo: job.contestInfo,
    });
    const isJobEntity = entityType === 'job';
    const countBaseline = isJobEntity ? currentCount : undefined;

    if (isCurrentlyBookmarked) {
      void removeBookmark(jobId, entityType, undefined, undefined, countBaseline);
      setBookmarkedJobs((prev) => prev.filter((id) => id !== jobId));
    } else {
      void addBookmark(
        {
          id: job.id,
          entityType,
          title: job.title,
          company: job.company,
          location: job.location,
          postType: (job.postType || 'job') as 'job' | 'contest',
          budget: job.budget || job.salary,
          deadline: job.deadline,
        },
        undefined,
        undefined,
        countBaseline,
      );
      setBookmarkedJobs((prev) => [...prev, jobId]);
    }
  };

  const bookmarkedIdSet = useMemo(() => new Set(bookmarkedJobs), [bookmarkedJobs]);

  const filteredJobs = useMemo(() => {
    return availableJobs.filter((job) => {
      if (isJobExpired(job)) return false;
      if (filters?.favoritesOnly && !matchesFavoritesFilter(job.id, true, bookmarkedIdSet)) {
        return false;
      }
      if (!filters) return true;
      return jobMatchesFilters(job, filters);
    });
  }, [filters, availableJobs, bookmarkedIdSet]);

  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs];
    const noDeadline = (j: Job) => Number.MAX_SAFE_INTEGER;

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return getJobCreatedTime(b) - getJobCreatedTime(a);
        case 'deadline-soon': {
          const da = getJobDeadline(a)?.getTime() ?? noDeadline(a);
          const db = getJobDeadline(b)?.getTime() ?? noDeadline(b);
          return da - db;
        }
        case 'deadline-far': {
          const da = getJobDeadline(a)?.getTime() ?? 0;
          const db = getJobDeadline(b)?.getTime() ?? 0;
          if (da === 0 && db === 0) return 0;
          if (da === 0) return 1;
          if (db === 0) return -1;
          return db - da;
        }
        case 'offers-fewest':
          return getJobOfferCount(a) - getJobOfferCount(b);
        case 'offers-most':
          return getJobOfferCount(b) - getJobOfferCount(a);
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredJobs, sortBy]);

  const listRevealKey = useMemo(
    () => `${sortBy}:${sortedJobs.map((job) => job.id).join(',')}`,
    [sortBy, sortedJobs],
  );

  return (
    <div className="flex-1 p-2 sm:p-3 lg:px-2 lg:py-3 max-w-full overflow-x-hidden">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 md:flex-nowrap md:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h2 className="shrink-0 text-base font-bold whitespace-nowrap sm:text-lg">
            Konkursy: {sortedJobs.length}
          </h2>

          {filters && onFilterChange && !isManager && (
            <Toggle
              variant="outline"
              size="sm"
              pressed={filters.favoritesOnly}
              onPressedChange={(pressed) =>
                onFilterChange((prev) => ({ ...prev, favoritesOnly: pressed }))
              }
              aria-label="Pokaż tylko zapisane"
              className="h-8 gap-1.5 px-2.5"
            >
              <Star
                className={cn(
                  'h-4 w-4 shrink-0',
                  filters.favoritesOnly && 'fill-primary text-primary',
                )}
              />
              <span className="text-sm whitespace-nowrap">Zapisane</span>
            </Toggle>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:ml-auto">
          {onToggleMap && (
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2">
              <Map className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Label htmlFor="map-toggle" className="cursor-pointer text-xs whitespace-nowrap sm:text-sm">
                {isMapVisible ? 'Lista' : 'Mapa'}
              </Label>
              <Switch
                id="map-toggle"
                checked={isMapVisible}
                onCheckedChange={() => onToggleMap()}
              />
            </div>
          )}

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-[8.75rem] sm:w-52">
              <ArrowUpDown className="mr-1 h-3.5 w-3.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Najnowsze konkursy</SelectItem>
              <SelectItem value="deadline-soon">Najmniej czasu na ofertę</SelectItem>
              <SelectItem value="deadline-far">Najwięcej czasu na ofertę</SelectItem>
              <SelectItem value="offers-fewest">Najmniej złożonych ofert</SelectItem>
              <SelectItem value="offers-most">Najwięcej złożonych ofert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoadingJobs && sortedJobs.length === 0 && (
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <div className="text-muted-foreground mb-2">Ładowanie konkursów...</div>
          </div>
        </div>
      )}

      {!isLoadingJobs && sortedJobs.length === 0 && availableJobs.length === 0 && (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-2">Brak konkursów</div>
        </div>
      )}

      {!isLoadingJobs && sortedJobs.length === 0 && availableJobs.length > 0 && (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-2">
            {filters?.favoritesOnly
              ? 'Brak zapisanych konkursów pasujących do filtrów'
              : 'Brak konkursów pasujących do filtrów'}
          </div>
        </div>
      )}

      <AnimatedList
        key={listRevealKey}
        className="max-w-full overflow-x-hidden"
        delay={50}
      >
        {sortedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onClick={() => onJobSelect?.(job.id)}
            onBookmark={isManager ? undefined : handleBookmark}
            isBookmarked={!isManager && bookmarkedJobs.includes(job.id)}
            onApplyClick={onApplyClick}
            isExpired={false}
            hasSubmittedOffer={submittedIds.has(job.id)}
            hasDraftOffer={draftIds.has(job.id)}
            isCheckingOffer={isLoadingBidStatus}
          />
        ))}
      </AnimatedList>
    </div>
  );
}
