import { Suspense } from 'react';
import { createClient } from '../../../lib/supabase/server';
import { resolveEffectiveUserId } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { fetchContractorRatingSummary, fetchContractorReviews } from '../../../lib/database/contractors';
import { fetchReviewsWrittenByUser } from '../../../lib/database/reviews';
import { RatingsDashboard } from '../../../components/reviews/RatingsDashboard';
import { RatingsDashboardSkeleton } from '../../../components/reviews/ReviewSkeletons';
import { ReviewEmptyState } from '../../../components/reviews/ReviewEmptyState';
import { Building2 } from 'lucide-react';

async function getRatingsData(userId: string) {
  const supabase = await createClient();

  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  const [ratingSummary, reviews, writtenReviews] = await Promise.all([
    fetchContractorRatingSummary(company.id, supabase),
    fetchContractorReviews(company.id, 20, 0, supabase),
    fetchReviewsWrittenByUser(supabase, userId),
  ]);

  return {
    ratingSummary,
    reviews: reviews || [],
    writtenReviews,
  };
}

async function RatingsDataFetcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id);
  const ratingsData = await getRatingsData(effectiveUserId);

  if (!ratingsData) {
    return (
      <ReviewEmptyState
        icon={Building2}
        title="Nie znaleziono firmy"
        description="Najpierw uzupełnij dane firmy w profilu."
      />
    );
  }

  return (
    <RatingsDashboard
      variant="contractor"
      ratingSummary={ratingsData.ratingSummary}
      reviews={ratingsData.reviews}
      writtenReviews={ratingsData.writtenReviews}
    />
  );
}

export default function RatingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<RatingsDashboardSkeleton />}>
        <RatingsDataFetcher />
      </Suspense>
    </div>
  );
}
