import { describe, expect, it } from 'vitest';
import { publicCoverCssVars, resolvePublicCoverMode } from './public-cover';

describe('public cover helpers', () => {
  it('prefers image over color', () => {
    expect(
      resolvePublicCoverMode({
        coverColor: '#112233',
        coverImageUrl: 'https://example.com/a.webp',
      }),
    ).toBe('image');
  });

  it('uses color when no image', () => {
    expect(resolvePublicCoverMode({ coverColor: '#abc' })).toBe('color');
    expect(resolvePublicCoverMode({})).toBe('default');
  });

  it('builds css vars without injecting quotes from url', () => {
    expect(
      publicCoverCssVars({
        coverColor: '#0B1520',
        coverImageUrl: 'https://example.com/x.webp',
      }),
    ).toEqual({
      '--public-cover-color': '#0B1520',
      '--public-cover-image': 'url("https://example.com/x.webp")',
    });
  });
});
