'use client';

import JobPage from '../../../components/JobPage';
import { useParams, useRouter } from 'next/navigation';
import { useAuthAwareBack } from '../../../hooks/useAuthAwareBack';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const handleBack = useAuthAwareBack();

  const handleJobSelect = (jobId: string) => {
    router.push(`/konkurs/${jobId}`);
  };

  return (
    <JobPage 
      jobId={id} 
      onBack={handleBack}
      onJobSelect={handleJobSelect}
    />
  );
}
