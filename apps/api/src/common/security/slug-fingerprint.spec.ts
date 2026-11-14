import { slugFingerprint } from './slug-fingerprint';

describe('slugFingerprint', () => {
  it('returns stable 8-hex chars without embedding the slug', () => {
    const fp = slugFingerprint('ivan-ivanov-ab12', 'test-pepper');
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
    expect(fp).not.toContain('ivan');
    expect(slugFingerprint('ivan-ivanov-ab12', 'test-pepper')).toBe(fp);
    expect(slugFingerprint('other-slug-zzzz', 'test-pepper')).not.toBe(fp);
  });
});
