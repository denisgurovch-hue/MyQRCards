import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicCard } from '../../../lib/public-api';
import { publicCardAbsoluteUrl } from '../../../lib/public-url';
import { PublicCardView } from './public-card-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublicCard(slug);

  if (!result.ok) {
    return {
      title: 'Визитка не найдена — MyQRCards',
      robots: { index: false, follow: false },
    };
  }

  const { card } = result;
  const description =
    card.summary?.trim() ||
    [card.jobTitle, card.companyName].filter(Boolean).join(' · ') ||
    'Цифровая визитка MyQRCards';

  return {
    title: `${card.displayName} — MyQRCards`,
    description,
    alternates: {
      canonical: publicCardAbsoluteUrl(card.slug),
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await fetchPublicCard(slug);

  if (!result.ok && result.kind === 'not_found') {
    notFound();
  }

  if (!result.ok) {
    return (
      <main className="public-shell">
        <section className="public-card">
          <h1>Временная ошибка</h1>
          <p className="muted">
            Не удалось загрузить визитку. Попробуйте обновить страницу чуть
            позже.
          </p>
          <Link href={`/u/${encodeURIComponent(slug)}`}>Обновить</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="public-shell">
      <PublicCardView card={result.card} />
    </main>
  );
}

