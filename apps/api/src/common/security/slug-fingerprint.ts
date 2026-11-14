import { createHash } from 'crypto';

/**
 * Non-reversible short fingerprint for security/ops logs.
 * Never log the raw public slug alongside this without need.
 */
export function slugFingerprint(
  slug: string,
  pepper = process.env.SLUG_LOG_PEPPER ?? 'myqrcards-dev-pepper',
): string {
  return createHash('sha256')
    .update(`${pepper}|${slug}`)
    .digest('hex')
    .slice(0, 8);
}
