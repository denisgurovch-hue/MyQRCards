import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicCard } from '../../../lib/public-api';
import {
  publicCoverCssVars,
  resolvePublicCoverMode,
} from '../../../lib/public-cover';
import { publicCardAbsoluteUrl } from '../../../lib/public-url';
import { safeHttpUrl } from '../../../lib/safe-url';
import { PublicCardView } from './public-card-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BRAND_OG_IMAGE = '/opengraph-image';

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
      title: 'Визитка не найдена',
      robots: { index: false, follow: false },
    };
  }

  const { card } = result;
  const description =
    card.summary?.trim() ||
    [card.jobTitle, card.companyName].filter(Boolean).join(' · ') ||
    'Цифровая визитка Signet';
  const canonical = publicCardAbsoluteUrl(card.slug);
  const photoUrl = safeHttpUrl(card.photoUrl);
  const ogImages = photoUrl
    ? [{ url: photoUrl, alt: card.displayName }]
    : [
        {
          url: BRAND_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'Signet',
        },
      ];

  return {
    title: card.displayName,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: card.displayName,
      description,
      url: canonical,
      locale: 'ru_RU',
      type: 'profile',
      images: ogImages,
    },
    twitter: {
      card: photoUrl ? 'summary_large_image' : 'summary',
      title: card.displayName,
      description,
      images: photoUrl ? [photoUrl] : [BRAND_OG_IMAGE],
    },
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await fetchPublicCard(slug);

  if (!result.ok && result.kind === 'not_found') {
    notFound();
  }

  if (!result.ok && result.kind === 'rate_limited') {
    return (
      <main className="public-shell">
        <section className="public-card">
          <div className="public-photo-wrap" aria-hidden="true">
            <div className="public-photo-fallback">…</div>
          </div>
          <h1 className="public-name">Слишком много запросов</h1>
          <p className="public-summary muted">
            Подождите минуту и обновите страницу.
          </p>
          <div className="public-actions">
            <Link
              className="public-action"
              href={`/u/${encodeURIComponent(slug)}`}
            >
              Обновить
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="public-shell">
        <section className="public-card">
          <div className="public-photo-wrap" aria-hidden="true">
            <div className="public-photo-fallback">!</div>
          </div>
          <h1 className="public-name">Временная ошибка</h1>
          <p className="public-summary muted">
            Не удалось загрузить визитку. Попробуйте обновить страницу чуть
            позже.
          </p>
          <div className="public-actions">
            <Link
              className="public-action"
              href={`/u/${encodeURIComponent(slug)}`}
            >
              Обновить
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const coverMode = resolvePublicCoverMode(result.card);
  const coverStyle = publicCoverCssVars(result.card);

  return (
    <main
      className="public-shell"
      data-cover={coverMode}
      style={coverStyle as CSSProperties}
    >
      <PublicCardView card={result.card} />
    </main>
  );
}

