'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import {
  createCompanyReview,
  fetchReviewByReviewerAndTender,
  updateCompanyReview,
  type CompanyReviewRecord,
} from '../../lib/database/reviews';
import { StarRatingInput } from './StarRatingInput';
import { ReviewCommentField } from './ReviewCommentField';
import { ReviewFormFooter } from './ReviewFormFooter';
import { ReviewFormSkeleton } from './ReviewSkeletons';

export type CooperationReviewVariant = 'manager' | 'contractor';

const COMMENT_PLACEHOLDERS: Record<CooperationReviewVariant, string> = {
  manager:
    'Napisz krótko: Jak oceniasz jakość prac, komunikację, terminowość odbioru i organizację?',
  contractor:
    'Napisz krótko: Jak oceniasz jakość dokumentacji, komunikację, terminowość płatności i organizację?',
};

interface CooperationReviewPanelProps {
  variant: CooperationReviewVariant;
  tenderId: string;
  counterpartyCompanyId: string;
  counterpartyCompanyName: string;
  onCancel?: () => void;
  onSubmitted?: (updated: { rating: number; comment: string }) => void;
}

export function CooperationReviewPanel({
  variant,
  tenderId,
  counterpartyCompanyId,
  counterpartyCompanyName,
  onCancel,
  onSubmitted,
}: CooperationReviewPanelProps): ReactElement {
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
    const review = await fetchReviewByReviewerAndTender(supabase, user.id, tenderId);
    setExisting(review);
    if (review) {
      setRating(review.rating);
      setComment(review.comment ?? '');
    } else {
      setRating(0);
      setComment('');
    }
    setLoading(false);
  }, [tenderId]);

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
    if (!counterpartyCompanyId) {
      toast.error('Brak danych firmy do oceny');
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

      if (existing) {
        const { error } = await updateCompanyReview(supabase, existing.id, user.id, {
          rating,
          comment,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Ocena współpracy została zaktualizowana');
      } else {
        const { error } = await createCompanyReview(supabase, counterpartyCompanyId, user.id, {
          rating,
          comment,
          tenderId,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Ocena współpracy została zapisana');
      }

      await loadExisting();
      onSubmitted?.({ rating, comment: comment.trim() });
    } catch {
      toast.error('Wystąpił błąd podczas zapisywania oceny');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ReviewFormSkeleton />;
  }

  const isEditing = existing !== null;

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-foreground">
        {isEditing
          ? `Twoja ocena współpracy z ${counterpartyCompanyName}`
          : `Jak oceniasz współpracę z ${counterpartyCompanyName}?`}
      </p>

      <StarRatingInput label="Twoja ocena" rating={rating} onRatingChange={setRating} />

      <ReviewCommentField
        id={`cooperation-review-comment-${tenderId}`}
        value={comment}
        onChange={setComment}
        placeholder={COMMENT_PLACEHOLDERS[variant]}
      />

      <ReviewFormFooter
        onCancel={onCancel}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        disabled={rating === 0 || !comment.trim()}
        submitLabel={isEditing ? 'Zapisz zmiany' : 'Wyślij ocenę'}
      />
    </div>
  );
}
