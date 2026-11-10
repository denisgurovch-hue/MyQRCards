import { isValidSlug, normalizeSlug, slugifyFromName } from './slug.util';

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

  it('generates slug from cyrillic name with suffix', () => {
    const slug = slugifyFromName('Иван Иванов');
    expect(isValidSlug(slug)).toBe(true);
    expect(slug.startsWith('ivan-ivanov-')).toBe(true);
  });
});
