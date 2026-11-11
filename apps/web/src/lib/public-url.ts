export function getPublicAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.WEB_ORIGIN ??
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export function publicCardPath(slug: string): string {
  return `/u/${slug}`;
}

export function publicCardAbsoluteUrl(slug: string): string {
  return `${getPublicAppUrl()}${publicCardPath(slug)}`;
}
