/** Parse comma-separated ADMIN_USER_EMAILS into a lowercase set. */
export function parseAdminEmails(raw: string | undefined | null): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  allowlist: Set<string> | string | undefined | null,
): boolean {
  if (!email?.trim()) {
    return false;
  }
  const set =
    allowlist instanceof Set ? allowlist : parseAdminEmails(allowlist ?? undefined);
  return set.has(email.trim().toLowerCase());
}
