'use client';

import ContractorProfilePage from '../../../components/ContractorProfilePage';
import { useParams } from 'next/navigation';
import { useAuthAwareBack } from '../../../hooks/useAuthAwareBack';

export default function ContractorProfile() {
  const params = useParams();
  const id = params.id as string;
  const handleBack = useAuthAwareBack();

  return (
    <ContractorProfilePage 
      contractorId={id}
      onBack={handleBack}
    />
  );
}
