import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '../../../../lib/admin/require-platform-admin';
import { fetchCommunityAccountClaimById } from '../../../../lib/database/community-account-claims';
import { CommunityClaimReview } from '../../../../components/admin/CommunityClaimReview';

interface AdminCommunityClaimDetailPageProps {
  params: Promise<{ claimId: string }>;
}

export default async function AdminCommunityClaimDetailPage({
  params,
}: AdminCommunityClaimDetailPageProps) {
  const { claimId } = await params;
  const { supabase } = await requirePlatformAdmin(
    `/administracja/odzyskanie-wspolnoty/${claimId}`,
  );
  const claim = await fetchCommunityAccountClaimById(supabase, claimId);
  if (!claim) {
    notFound();
  }

  return <CommunityClaimReview claim={claim} />;
}
