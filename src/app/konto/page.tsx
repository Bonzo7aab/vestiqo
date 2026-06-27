import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { getUserVerificationStatus } from '../../lib/database/verification-queries';
import {
  fetchVerificationDocumentReviews,
  getVerificationDocumentSignedUrls,
  type VerificationDocumentEntry,
} from '../../lib/database/admin-verification';
import { UserAccountPageClient } from '../../components/UserAccountPageClient';
import { fetchUserPrimaryCompany } from '../../lib/database/companies';
import { parseServiceSubcategorySlugsFromMetadata } from '../../lib/database/contractor-service-categories';

export default async function Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/logowanie?redirectTo=/konto');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profileRow } = await sb
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  const isContractor = profileRow?.user_type === 'contractor';

  const verificationStatus = await getUserVerificationStatus(user.id, supabase);

  let existingDocuments: VerificationDocumentEntry[] = [];
  let documentReviews: Awaited<ReturnType<typeof fetchVerificationDocumentReviews>> = {};
  let contractorCompanyId: string | null = null;
  let initialServiceSubcategorySlugs: string[] | undefined;

  if (isContractor) {
    const [casResult, profileDocsResult, primaryCompanyResult] = await Promise.all([
      sb
        .from('contractor_account_settings')
        .select('oc_valid_until, oc_policy_scan_path')
        .eq('user_id', user.id)
        .maybeSingle(),
      sb
        .from('user_profiles')
        .select('verification_document_paths')
        .eq('id', user.id)
        .maybeSingle(),
      fetchUserPrimaryCompany(supabase, user.id),
    ]);
    const accountOcPath = (casResult.data?.oc_policy_scan_path as string | null) ?? null;
    const verificationPaths =
      (profileDocsResult.data?.verification_document_paths as Record<string, string> | null | undefined) ?? {};

    const docPaths = {
      ...verificationPaths,
      ...(accountOcPath && !verificationPaths.insurance
        ? { insurance: accountOcPath }
        : {}),
    };

    [existingDocuments, documentReviews] = await Promise.all([
      getVerificationDocumentSignedUrls(supabase, docPaths),
      fetchVerificationDocumentReviews(supabase, user.id),
    ]);

    if (primaryCompanyResult.data?.id) {
      contractorCompanyId = primaryCompanyResult.data.id;
      const { data: companyMeta } = await sb
        .from('companies')
        .select('metadata')
        .eq('id', primaryCompanyResult.data.id)
        .maybeSingle();
      initialServiceSubcategorySlugs = parseServiceSubcategorySlugsFromMetadata(
        companyMeta?.metadata,
      );
    }
  }

  return (
    <UserAccountPageClient
      verificationStatus={verificationStatus}
      verificationDocuments={isContractor ? existingDocuments : undefined}
      documentReviews={isContractor ? documentReviews : undefined}
      contractorCompanyId={isContractor ? contractorCompanyId : null}
      initialServiceSubcategorySlugs={
        isContractor ? initialServiceSubcategorySlugs : undefined
      }
    />
  );
}
