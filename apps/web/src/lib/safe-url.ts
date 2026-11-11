const ALLOWED_WEB = new Set(['http:', 'https:']);

export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!ALLOWED_WEB.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  return `tel:${cleaned}`;
}

export function safeMailtoHref(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  return `mailto:${email}`;
}
