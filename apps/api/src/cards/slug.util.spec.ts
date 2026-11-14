import {
  encodeCrockfordBase32,
  generateRandomSlug,
  isValidSlug,
  normalizeSlug,
  RANDOM_SLUG_BYTES,
  RANDOM_SLUG_LENGTH,
  slugifyFromName,
} from './slug.util';

describe('slug utils', () => {
  it('validates slug format and length', () => {
    expect(isValidSlug('ivan-ivanov')).toBe(true);
    expect(isValidSlug('ab')).toBe(false);
    expect(isValidSlug('Ivan')).toBe(false);
    expect(isValidSlug('bad_slug')).toBe(false);
    expect(isValidSlug('a'.repeat(33))).toBe(false);
  });

  it('normalizes to lowercase', () => {
    expect(normalizeSlug('  Hello-World  ')).toBe('hello-world');
  });

  it('encodes 16 bytes to 26 Crockford characters', () => {
    const bytes = Buffer.alloc(RANDOM_SLUG_BYTES, 0);
    const encoded = encodeCrockfordBase32(bytes);
    expect(encoded).toHaveLength(RANDOM_SLUG_LENGTH);
    expect(encoded).toMatch(/^[0-9a-z]+$/);
    expect(encoded).not.toMatch(/[ilo]/);
  });

  it('generates random slug with ≥128 bits, independent of name', () => {
    const a = generateRandomSlug();
    const b = generateRandomSlug();
    expect(isValidSlug(a)).toBe(true);
    expect(isValidSlug(b)).toBe(true);
    expect(a).toHaveLength(RANDOM_SLUG_LENGTH);
    expect(b).toHaveLength(RANDOM_SLUG_LENGTH);
    expect(a).not.toBe(b);
    expect(a.startsWith('ivan')).toBe(false);
  });

  it('legacy slugifyFromName still works for compat tests', () => {
    const slug = slugifyFromName('Иван Иванов');
    expect(isValidSlug(slug)).toBe(true);
    expect(slug.startsWith('ivan-ivanov-')).toBe(true);
  });
});
