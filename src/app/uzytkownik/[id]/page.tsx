'use client';

import { useParams } from 'next/navigation';
import { HousingEntityProfilePage } from '../../../components/housing-entity/HousingEntityProfilePage';

export default function UzytkownikProfilePage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;

  return <HousingEntityProfilePage entityId={id} />;
}
