export type ContactClickChannel =
  | 'phone'
  | 'email'
  | 'whatsapp'
  | 'telegram'
  | 'link';

export function resolveContactChannel(input: {
  kind: 'phone' | 'email' | 'website' | 'link';
  type?: string | null;
  url?: string | null;
}): ContactClickChannel {
  if (input.kind === 'phone') {
    return 'phone';
  }
  if (input.kind === 'email') {
    return 'email';
  }

  const type = (input.type ?? '').trim().toLowerCase();
  if (type === 'whatsapp' || type === 'telegram') {
    return type;
  }

  const url = (input.url ?? '').trim().toLowerCase();
  if (
    url.includes('wa.me/') ||
    url.includes('whatsapp.com') ||
    url.includes('api.whatsapp.com')
  ) {
    return 'whatsapp';
  }
  if (url.includes('t.me/') || url.includes('telegram.me/')) {
    return 'telegram';
  }

  return 'link';
}

/** Best-effort public click beacon; never blocks navigation. */
export function trackContactClick(
  slug: string,
  channel: ContactClickChannel,
): void {
  const path = `/api/v1/public/cards/${encodeURIComponent(slug)}/clicks`;
  const body = JSON.stringify({ channel });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        path,
        new Blob([body], { type: 'application/json' }),
      );
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'omit',
    keepalive: true,
    cache: 'no-store',
  }).catch(() => undefined);
}
