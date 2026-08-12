'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import {
  createCompanyReview,
  fetchReviewByReviewerAndJob,
  type CompanyReviewRecord,
} from '../../lib/database/reviews';
import { StarRatingInput } from './StarRatingInput';
import { ReviewCommentField } from './ReviewCommentField';
import { ReviewFormFooter } from './ReviewFormFooter';
import { ReviewFormSkeleton } from './ReviewSkeletons';
import { ExistingReviewSummary } from './ExistingReviewSummary';

interface SubmissionReviewPanelProps {
  jobId: string;
  managerCompanyId: string;
  managerCompanyName: string;
  onCancel?: () => void;
  onSubmitted?: () => void;
}

export function SubmissionReviewPanel({
  jobId,
  managerCompanyId,
  managerCompanyName,
  onCancel,
  onSubmitted,
}: SubmissionReviewPanelProps): ReactElement {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState<CompanyReviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const review = await fetchReviewByReviewerAndJob(supabase, user.id, jobId);
    setExisting(review);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const handleSubmit = async (): Promise<void> => {
    if (rating === 0) {
      toast.error('Wybierz ocenę od 1 do 5 gwiazdek');
      return;
    }
    if (!comment.trim()) {
      toast.error('Dodaj komentarz');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Musisz być zalogowany');
        return;
      }

      const { error } = await createCompanyReview(supabase, managerCompanyId, user.id, {
        rating,
        comment,
        jobId,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Opinia o konkursie została zapisana');
      await loadExisting();
      onSubmitted?.();
    } catch {
      toast.error('Wystąpił błąd podczas zapisywania opinii');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ReviewFormSkeleton />;
  }

  if (existing) {
    return (
      <ExistingReviewSummary
        description={`Opinia o konkursie ${managerCompanyName} została już wystawiona.`}
        rating={existing.rating}
        comment={existing.comment}
        createdAt={existing.createdAt}
        onClose={onCancel}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Oceń konkurs organizatora{' '}
        <span className="font-medium text-foreground">{managerCompanyName}</span>.
      </p>

      <StarRatingInput label="Ocena konkursu" rating={rating} onRatingChange={setRating} />

      <ReviewCommentField
        id="submission-review-comment"
        value={comment}
        onChange={setComment}
        placeholder="Opisz swoje doświadczenie z konkursem…"
      />

      <ReviewFormFooter
        onCancel={onCancel}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        disabled={rating === 0 || !comment.trim()}
        submitLabel="Wyślij ocenę konkursu"
      />
    </div>
  );
}
