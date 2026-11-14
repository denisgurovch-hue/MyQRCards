'use client';

import { useParams } from 'next/navigation';
import { EditCardV2 } from './edit-card-v2';

export default function EditCardV2Page() {
  const params = useParams<{ id: string }>();
  return <EditCardV2 cardId={params.id} />;
}
