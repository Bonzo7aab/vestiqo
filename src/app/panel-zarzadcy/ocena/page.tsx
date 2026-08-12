import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import {
  fetchContractorRatingSummary,
  fetchContractorReviews,
} from '../../../lib/database/contractors';
import { fetchReviewsWrittenByUser } from '../../../lib/database/reviews';
import { RatingsDashboard } from '../../../components/reviews/RatingsDashboard';
import { ReviewEmptyState } from '../../../components/reviews/ReviewEmptyState';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import type { ReactElement } from 'react';

export default async function OcenaPage(): Promise<ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Wymagane logowanie.</p>
      </div>
    );
  }

  const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);

  if (!company) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ReviewEmptyState
          icon={Building2}
          title="Nie znaleziono firmy"
          description="Najpierw uzupełnij dane firmy w profilu."
          action={
            <Button asChild>
              <Link href="/konto">Przejdź do konta</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [ratingSummary, reviews, writtenReviews] = await Promise.all([
    fetchContractorRatingSummary(company.id, supabase),
    fetchContractorReviews(company.id, 50, 0, supabase),
    fetchReviewsWrittenByUser(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <RatingsDashboard
        variant="manager"
        ratingSummary={ratingSummary}
        reviews={reviews}
        writtenReviews={writtenReviews}
      />
    </div>
  );
}
