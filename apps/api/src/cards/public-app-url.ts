/**
 * Canonical public app origin for QR payloads.
 * Uses WEB_ORIGIN only — never request Host / X-Forwarded-Host.
 */
export function normalizePublicAppUrl(raw: string | undefined | null): string {
  const value = (raw ?? '').trim();
  if (!value) {
    throw new Error('WEB_ORIGIN is not configured');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('WEB_ORIGIN is not a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('WEB_ORIGIN must use http or https');
  }

  if (!parsed.hostname) {
    throw new Error('WEB_ORIGIN hostname is missing');
  }

  return value.replace(/\/$/, '');
}

export function publicCardCanonicalUrl(
  publicAppUrl: string,
  slug: string,
): string {
  const base = publicAppUrl.replace(/\/$/, '');
  return `${base}/u/${slug}`;
}
