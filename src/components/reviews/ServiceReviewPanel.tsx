'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import {
  createCompanyReview,
  fetchReviewByReviewerAndJob,
  updateReviewImageUrls,
  type CompanyReviewRecord,
} from '../../lib/database/reviews';
import { uploadReviewImage } from '../../lib/storage/review-images';
import { StarRatingInput } from './StarRatingInput';
import { Label } from '../ui/label';
import { ReviewCommentField } from './ReviewCommentField';
import { ReviewFormFooter } from './ReviewFormFooter';
import { ReviewFormSkeleton } from './ReviewSkeletons';
import { ExistingReviewSummary } from './ExistingReviewSummary';

const MAX_PHOTOS = 3;

interface ServiceReviewPanelProps {
  jobId: string;
  contractorCompanyId: string;
  contractorName: string;
  onCancel?: () => void;
  onSubmitted?: () => void;
}

export function ServiceReviewPanel({
  jobId,
  contractorCompanyId,
  contractorName,
  onCancel,
  onSubmitted,
}: ServiceReviewPanelProps): ReactElement {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
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

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const combined = [...photoFiles, ...files].slice(0, MAX_PHOTOS);
    setPhotoFiles(combined);
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPhotoPreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removePhoto = (index: number): void => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

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

      const { data: created, error } = await createCompanyReview(
        supabase,
        contractorCompanyId,
        user.id,
        { rating, comment, jobId },
      );

      if (error || !created) {
        toast.error(error?.message ?? 'Nie udało się zapisać opinii');
        return;
      }

      const imageUrls: string[] = [];
      for (const file of photoFiles) {
        const { url, error: uploadError } = await uploadReviewImage(
          file,
          user.id,
          created.id,
        );
        if (uploadError || !url) {
          toast.error(uploadError?.message ?? 'Błąd przesyłania zdjęcia');
          continue;
        }
        imageUrls.push(url);
      }

      if (imageUrls.length > 0) {
        const { error: updateError } = await updateReviewImageUrls(
          supabase,
          created.id,
          imageUrls,
        );
        if (updateError) {
          toast.error(updateError.message);
        }
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
        description={`Opinia o wykonawcy w konkursie ${contractorName} została już wystawiona.`}
        rating={existing.rating}
        comment={existing.comment}
        createdAt={existing.createdAt}
        imageUrls={existing.imageUrls}
        onClose={onCancel}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Oceń konkurs wykonawcy <span className="font-medium text-foreground">{contractorName}</span>{' '}
        po zakończeniu realizacji.
      </p>

      <StarRatingInput label="Ocena konkursu" rating={rating} onRatingChange={setRating} />

      <ReviewCommentField
        id="service-review-comment"
        value={comment}
        onChange={setComment}
        placeholder="Opisz jakość realizacji konkursu…"
      />

      <div>
        <Label>Dodaj zdjęcie</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Maks. {MAX_PHOTOS} zdjęcia (JPG, PNG, WEBP)
        </p>
        {photoPreviews.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {photoPreviews.map((preview, index) => (
              <div key={preview} className="relative h-20 w-20 overflow-hidden rounded-md border">
                <Image src={preview} alt="" fill className="object-cover" />
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  onClick={() => removePhoto(index)}
                  aria-label="Usuń zdjęcie"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photoFiles.length < MAX_PHOTOS && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted/50">
            <ImagePlus className="h-4 w-4" />
            Wybierz zdjęcie
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              multiple
              onChange={handlePhotosChange}
            />
          </label>
        )}
      </div>

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
