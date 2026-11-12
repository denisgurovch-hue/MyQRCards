import { notFound, redirect } from 'next/navigation';
import { toPresentCardView, type OwnerCardForPresent } from '../../../../lib/present-card';
import { serverApiFetch } from '../../../../lib/server-api';
import { PresentView } from './present-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MeResponse = {
  user: { id: string };
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PresentCardPage({ params }: PageProps) {
  const { id } = await params;

  const me = await serverApiFetch<MeResponse>('/api/v1/auth/me');
  if (!me) {
    redirect('/login');
  }

  const payload = await serverApiFetch<{ card: OwnerCardForPresent }>(
    `/api/v1/cards/${encodeURIComponent(id)}`,
  );
  if (!payload?.card) {
    notFound();
  }

  return <PresentView card={toPresentCardView(payload.card)} />;
}
