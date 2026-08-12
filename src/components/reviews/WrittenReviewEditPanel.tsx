'use client';

import { useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import { updateCompanyReview } from '../../lib/database/reviews';
import { StarRatingInput } from './StarRatingInput';
import { ReviewCommentField } from './ReviewCommentField';
import { ReviewFormFooter } from './ReviewFormFooter';

interface WrittenReviewEditPanelProps {
  reviewId: string;
  counterpartyName: string;
  initialRating: number;
  initialComment: string;
  onCancel?: () => void;
  onSaved?: (updated: { rating: number; comment: string }) => void;
}

export function WrittenReviewEditPanel({
  reviewId,
  counterpartyName,
  initialRating,
  initialComment,
  onCancel,
  onSaved,
}: WrittenReviewEditPanelProps): ReactElement {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);

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

      const { error } = await updateCompanyReview(supabase, reviewId, user.id, {
        rating,
        comment,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Ocena została zaktualizowana');
      onSaved?.({ rating, comment: comment.trim() });
    } catch {
      toast.error('Wystąpił błąd podczas zapisywania oceny');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-foreground">Twoja ocena dla {counterpartyName}</p>

      <StarRatingInput label="Twoja ocena" rating={rating} onRatingChange={setRating} />

      <ReviewCommentField
        id={`written-review-comment-${reviewId}`}
        value={comment}
        onChange={setComment}
      />

      <ReviewFormFooter
        onCancel={onCancel}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        disabled={rating === 0 || !comment.trim()}
        submitLabel="Zapisz zmiany"
      />
    </div>
  );
}
