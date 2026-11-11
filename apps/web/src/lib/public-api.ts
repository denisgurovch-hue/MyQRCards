import type { PublicCard } from './public-card.types';

export type PublicCardResult =
  | { ok: true; card: PublicCard }
  | { ok: false; kind: 'not_found' }
  | { ok: false; kind: 'error'; status: number };

/**
 * Server-side fetch for public cards.
 * Never forwards cookies or Authorization.
 */
export async function fetchPublicCard(slug: string): Promise<PublicCardResult> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  let response: Response;
  try {
    response = await fetch(
      `${apiUrl}/api/v1/public/cards/${encodeURIComponent(slug)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      },
    );
  } catch {
    return { ok: false, kind: 'error', status: 0 };
  }

  if (response.status === 404) {
    return { ok: false, kind: 'not_found' };
  }

  if (!response.ok) {
    return { ok: false, kind: 'error', status: response.status };
  }

  const data = (await response.json()) as { card: PublicCard };
  return { ok: true, card: data.card };
}
