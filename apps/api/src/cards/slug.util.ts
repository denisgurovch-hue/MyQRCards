import { randomBytes } from 'crypto';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Crockford Base32 alphabet (lowercase), 5 bits per character. */
const CROCKFORD = '0123456789abcdefghjkmnpqrstuvwxyz';

const CYR_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Random public slug: 128 bits → 26 Crockford chars. */
export const RANDOM_SLUG_LENGTH = 26;
export const RANDOM_SLUG_BYTES = 16;

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 6 && slug.length <= 32 && SLUG_RE.test(slug);
}

/**
 * Encode raw bytes as Crockford Base32 (lowercase, no padding).
 * Does not alter case after encoding (alphabet is already lowercase).
 */
export function encodeCrockfordBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(value >>> bits) & 31];
    }
  }

  if (bits > 0) {
    out += CROCKFORD[(value << (5 - bits)) & 31];
  }

  return out;
}

/**
 * Cryptographically random slug independent of name/company/email.
 * 16 bytes (128 bits) → 26 URL-safe Crockford characters.
 */
export function generateRandomSlug(): string {
  const encoded = encodeCrockfordBase32(randomBytes(RANDOM_SLUG_BYTES));
  // 128 bits always encode to 26 chars; assert length without truncating entropy.
  if (encoded.length !== RANDOM_SLUG_LENGTH) {
    throw new Error(
      `Unexpected random slug length ${encoded.length}, expected ${RANDOM_SLUG_LENGTH}`,
    );
  }
  return encoded;
}

/**
 * Legacy name-based slug (low entropy). Kept for tests/compat only —
 * new cards must use {@link generateRandomSlug}.
 */
export function slugifyFromName(displayName: string): string {
  const lowered = displayName.trim().toLowerCase();
  let out = '';
  for (const char of lowered) {
    if (CYR_MAP[char] !== undefined) {
      out += CYR_MAP[char];
      continue;
    }
    if (/[a-z0-9]/.test(char)) {
      out += char;
      continue;
    }
    if (/\s|-|_/.test(char)) {
      out += '-';
    }
  }
  out = out.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (out.length < 3) {
    out = 'card';
  }
  out = out.slice(0, 24).replace(/-$/g, '');
  const suffix = randomBytes(2).toString('hex');
  let candidate = `${out}-${suffix}`;
  if (candidate.length < 6) {
    candidate = `card-${suffix}${randomBytes(1).toString('hex')}`;
  }
  return candidate.slice(0, 32);
}
