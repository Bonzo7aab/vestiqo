import React, { useMemo, useCallback } from 'react';
import { MapPin, Clock, Star, Eye, Wrench, Users, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getDaysRemaining, formatDaysRemaining } from '../utils/tenderHelpers';
import { useUserProfile } from '../contexts/AuthContext';
import type { Job } from '../types/job';
import { ContestApplyOfferButton } from './contest/ContestApplyOfferButton';
import { ContestJobCard } from './contest/ContestJobCard';
import {
  getContestSubmissionDeadline,
  resolveContestStatus,
} from '../lib/contest-display';
import { formatContestCategoryLine } from '../lib/config/categoryConfig';

interface JobCardProps {
  job: Partial<Job> & {
    id: string;
    title: string;
    company: string;
    location: string | { city: string; sublocality_level_1?: string };
    type: string;
    salary: string;
    description: string;
    postedTime: string;
    applications?: number;
    verified: boolean;
    urgent?: boolean;
    distance?: number;
  };
  onClick?: () => void;
  onBookmark?: (jobId: string) => void;
  isBookmarked?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHighlighted?: boolean;
  onApplyClick?: (jobId: string, jobData?: Job) => void;
  isExpired?: boolean;
  hasSubmittedOffer?: boolean;
  hasDraftOffer?: boolean;
  isCheckingOffer?: boolean;
}

// Helper function to format numbers with spaces for thousands
function formatNumberWithSpaces(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const JobCard = React.memo(function JobCard({ 
  job, 
  onClick, 
  onBookmark, 
  isBookmarked = false, 
  onMouseEnter, 
  onMouseLeave, 
  isHighlighted = false,
  onApplyClick,
  isExpired = false,
  hasSubmittedOffer = false,
  hasDraftOffer = false,
  isCheckingOffer = false,
}: JobCardProps) {
  const { user } = useUserProfile();
  const isManager = user?.userType === 'manager';
  const isLoggedIn = Boolean(user);

  const handleBookmarkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(job.id);
  }, [job.id, onBookmark]);

  const bookmarkTooltip = isBookmarked ? 'Usuń z zapisanych' : 'Dodaj do zapisanych';

  const handleApplyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApplyClick) {
      onApplyClick(job.id, {
        ...job,
        postType: job.postType || 'job'
      } as Job);
    }
  }, [job, onApplyClick]);

  const isTender = useMemo(() => job.postType === 'contest', [job.postType]);
  const contestStatus = useMemo(() => resolveContestStatus(job), [job]);
  const submissionDeadline = useMemo(() => getContestSubmissionDeadline(job), [job]);
  const contestCategoryLine = useMemo(
    () =>
      formatContestCategoryLine({
        category: job.category,
        subcategory: job.subcategory,
      }),
    [job.category, job.subcategory],
  );

  // Calculate days remaining for deadline
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const deadlineDaysRemaining = useMemo(() => {
    try {
      if (submissionDeadline) {
        const date = new Date(submissionDeadline);
        if (isNaN(date.getTime())) return null;
        return getDaysRemaining(date);
      }
    } catch (error) {
      console.error('Error calculating days remaining:', error);
    }
    return null;
  }, [submissionDeadline]);

  // Check if deadline is ending soon (less than 7 days, including today)
  const isEndingSoon = useMemo(() => {
    if (deadlineDaysRemaining === null) return false;
    // Check if 7 days or less remaining (including 0 for today)
    return deadlineDaysRemaining >= 0 && deadlineDaysRemaining <= 6;
  }, [deadlineDaysRemaining]);

  // Format deadline for display
  const formattedDeadline = useMemo(() => {
    if (!job.deadline) return null;
    try {
      const deadlineDate = new Date(job.deadline);
      if (isNaN(deadlineDate.getTime())) return job.deadline; // Return as-is if invalid
      return deadlineDate.toLocaleDateString('pl-PL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return job.deadline; // Return as-is if parsing fails
    }
  }, [job.deadline]);

  if (isTender) {
    return (
      <ContestJobCard
        job={job}
        contestStatus={contestStatus}
        submissionDeadline={submissionDeadline}
        contestCategoryLine={contestCategoryLine}
        deadlineDaysRemaining={deadlineDaysRemaining}
        isEndingSoon={isEndingSoon}
        isExpired={isExpired}
        isBookmarked={isBookmarked}
        isHighlighted={isHighlighted}
        isManager={isManager}
        isLoggedIn={isLoggedIn}
        user={user}
        hasSubmittedOffer={hasSubmittedOffer}
        hasDraftOffer={hasDraftOffer}
        isCheckingOffer={isCheckingOffer}
        onClick={onClick}
        onBookmark={onBookmark}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onApplyClick={handleApplyClick}
      />
    );
  }
  // Updated job card design for regular jobs with action buttons
  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow w-full max-w-full ${
        isExpired ? 'bg-gray-50 opacity-60' : 'bg-white'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex-1 min-w-0">
            {/* Badges and bookmarks/visited on same level on mobile, separate on desktop */}
            <div className="flex items-center justify-between gap-1.5 md:gap-2 flex-wrap mb-2 md:mb-0 md:hidden">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                {isExpired && (
                  <Badge variant="secondary" className="text-xs">
                    Wygasłe
                  </Badge>
                )}
                {job.urgent && (
                  <Badge variant="destructive" className="text-xs">
                    Pilne
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {(job.applications !== undefined || job.metrics?.applications !== undefined) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-default">
                          <Users className="w-3.5 h-3.5" />
                          <span>{job.applications ?? job.metrics?.applications ?? 0} ofert</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ofert</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {(job.visits_count !== undefined || job.bookmarks_count !== undefined) && (
                    <>
                      {job.visits_count !== undefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{job.visits_count}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Odwiedzone</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {job.bookmarks_count !== undefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Star className="w-3.5 h-3.5" />
                              <span>{job.bookmarks_count}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Zapisane</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
                {!isManager && onBookmark ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-muted-foreground hover:text-foreground ${isBookmarked ? 'text-primary' : ''}`}
                        onClick={handleBookmarkClick}
                      >
                        <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-primary' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{bookmarkTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>
            
            <div className="flex items-start md:items-center justify-between mb-2 gap-2">
              <div className="flex items-start md:items-center gap-2 md:gap-3 flex-wrap min-w-0 flex-1">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  <Wrench className="w-4 h-4 text-primary flex-shrink-0" />
                  <h3 className={`font-semibold text-base md:text-lg truncate ${isExpired ? 'text-gray-500' : ''}`}>{job.title}</h3>
                </div>
                <div className="hidden md:flex items-center gap-1.5 md:gap-2 flex-wrap">
                  {isExpired && (
                    <Badge variant="secondary" className="text-xs">
                      Wygasłe
                    </Badge>
                  )}
                  {job.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      Pilne
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Action buttons in top right block - desktop only */}
              <div className="hidden md:flex gap-1.5 md:gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {(job.applications !== undefined || job.metrics?.applications !== undefined) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-default">
                          <Users className="w-3.5 h-3.5" />
                          <span>{job.applications ?? job.metrics?.applications ?? 0} ofert</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ofert</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {(job.visits_count !== undefined || job.bookmarks_count !== undefined) && (
                    <>
                      {job.visits_count !== undefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{job.visits_count}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Odwiedzone</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {job.bookmarks_count !== undefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Star className="w-3.5 h-3.5" />
                              <span>{job.bookmarks_count}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Zapisane</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
                {!isManager && onBookmark ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-muted-foreground hover:text-foreground ${isBookmarked ? 'text-primary' : ''}`}
                        onClick={handleBookmarkClick}
                      >
                        <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-primary' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{bookmarkTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 text-xs text-gray-600 mb-3">
              <div className='flex items-center gap-2 sm:gap-4 min-w-0'>
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {typeof job.location === 'string' 
                      ? job.location 
                      : (job.location && typeof job.location === 'object' && 'city' in job.location)
                        ? (job.location.sublocality_level_1
                            ? `${job.location.city || 'Unknown'}, ${job.location.sublocality_level_1}`
                            : job.location.city || 'Unknown')
                        : 'Unknown'}
                  </span>
                </div>
                <span className="hidden sm:inline h-4 border-gray-300 border-r-2 flex-shrink-0" />
                <span className="font-normal text-gray-500 truncate">{job.company}</span>
              </div>
              <Badge variant="secondary" className="w-fit">
                {typeof job.category === 'string' ? job.category : job.category?.name || job.type}
              </Badge>
            </div>
            
            <p className="text-gray-700 text-xs sm:text-sm mb-3 md:mb-0 line-clamp-2">
              {job.description}
            </p>

            <div className='flex flex-col md:flex-row md:justify-between gap-4 md:gap-6'>
              <div className="space-y-3 mt-0 md:mt-4 flex-1">
                {/* Budget Display */}
                {job.budget && (job.budget.min !== null || job.budget.max !== null) && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-semibold text-sm">Budżet:</span>
                    <span className="text-green-700 font-medium text-sm">
                      {job.budget.min !== null && job.budget.max !== null && job.budget.min !== job.budget.max
                        ? `${formatNumberWithSpaces(job.budget.min)} – ${formatNumberWithSpaces(job.budget.max)} ${job.budget.currency || 'zł'}`
                        : job.budget.min !== null
                        ? `${formatNumberWithSpaces(job.budget.min)} ${job.budget.currency || 'zł'}`
                        : job.budget.max !== null
                        ? `${formatNumberWithSpaces(job.budget.max)} ${job.budget.currency || 'zł'}`
                        : 'Do negocjacji'}
                    </span>
                  </div>
                )}

                {/* Specialization Tags (Subcategory + Skills) */}
                {(job.subcategory || (job.skills && job.skills.length > 0)) && (
                  <div className="flex flex-wrap gap-1">
                    {/* Subcategory tag */}
                    {job.subcategory && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {job.subcategory}
                      </Badge>
                    )}
                    {/* Skills tags */}
                    {job.skills && job.skills.length > 0 && (
                      <>
                        {job.skills.slice(0, job.subcategory ? 2 : 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > (job.subcategory ? 2 : 3) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                +{job.skills.length - (job.subcategory ? 2 : 3)} więcej
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className='bg-white rounded-sm'>
                                <div className="flex flex-wrap gap-1">
                                  {job.skills.slice(job.subcategory ? 2 : 3).map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Job details */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                  {job.salary && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">💰</span>
                      <span>Stawka: <span className="text-green-600">{job.salary}</span></span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Opublikowano: {job.postedTime}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      {formattedDeadline && (
                        <>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>Termin: {formattedDeadline}</span>
                          </div>
                          {deadlineDaysRemaining !== null && (
                            <span className={`pl-5 sm:pl-0 sm:ml-1 ${isEndingSoon ? 'text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded' : 'text-gray-500'}`}>
                              ({formatDaysRemaining(deadlineDaysRemaining)} do końca)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {job.distance && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <span className="text-xs">
                        {job.distance < 1 ? `${Math.round(job.distance * 1000)}m` : `${job.distance.toFixed(1)}km`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Apply button at bottom */}
              {!isManager && (
                <div className="flex md:flex-wrap md:content-end">
                  <ContestApplyOfferButton
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full md:w-auto"
                    isLoggedIn={isLoggedIn}
                    user={user}
                    hasSubmittedOffer={hasSubmittedOffer}
                    hasDraftOffer={hasDraftOffer}
                    isCheckingOffer={isCheckingOffer}
                    onApply={handleApplyClick}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default JobCard;