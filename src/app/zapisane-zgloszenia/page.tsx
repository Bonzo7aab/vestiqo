'use client'

import { BookmarkedJobsPage } from '../../components/BookmarkedJobsPage';
import { useRouter } from 'next/navigation';
import { routes } from '../../lib/routes';

export default function BookmarkedJobs() {
  const router = useRouter();

  return (
    <BookmarkedJobsPage 
      onBack={() => router.push('/')}
      onJobSelect={(jobId: string) => router.push(routes.konkurs(jobId))}
    />
  );
}
