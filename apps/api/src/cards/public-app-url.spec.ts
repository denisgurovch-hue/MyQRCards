import {
  normalizePublicAppUrl,
  publicCardCanonicalUrl,
} from './public-app-url';

describe('public-app-url', () => {
  it('strips trailing slash from base URL', () => {
    expect(normalizePublicAppUrl('https://cards.example/')).toBe(
      'https://cards.example',
    );
  });

  it('builds canonical card URL', () => {
    expect(
      publicCardCanonicalUrl('https://cards.example/', 'ivan-ivanov'),
    ).toBe('https://cards.example/u/ivan-ivanov');
  });

  it('rejects missing or invalid configuration', () => {
    expect(() => normalizePublicAppUrl('')).toThrow(/WEB_ORIGIN/);
    expect(() => normalizePublicAppUrl('not-a-url')).toThrow(/valid absolute/);
    expect(() => normalizePublicAppUrl('ftp://cards.example')).toThrow(
      /http or https/,
    );
  });
});
