'use client';

import JobPage from '../../../components/JobPage';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useAuthAwareBack } from '../../../hooks/useAuthAwareBack';
import { parseKonkursPathParam } from '../../../lib/listing/konkurs-slug';
import { routes } from '../../../lib/routes';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params.id as string;
  const id = parseKonkursPathParam(rawParam);
  const handleBack = useAuthAwareBack();

  if (!id) {
    notFound();
  }

  const handleJobSelect = (jobId: string) => {
    router.push(routes.konkurs(jobId));
  };

  return (
    <JobPage
      jobId={id}
      onBack={handleBack}
      onJobSelect={handleJobSelect}
    />
  );
}
