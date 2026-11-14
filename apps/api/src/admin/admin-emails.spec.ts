import { isAdminEmail, parseAdminEmails } from './admin-emails';

describe('admin-emails', () => {
  it('parses comma-separated emails case-insensitively', () => {
    const set = parseAdminEmails(' Admin@Example.com , other@x.test,, ');
    expect(set.size).toBe(2);
    expect(set.has('admin@example.com')).toBe(true);
    expect(set.has('other@x.test')).toBe(true);
  });

  it('returns empty set for blank input', () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails('  ').size).toBe(0);
  });

  it('matches allowlisted emails only', () => {
    const set = parseAdminEmails('boss@signet.test');
    expect(isAdminEmail('boss@signet.test', set)).toBe(true);
    expect(isAdminEmail('BOSS@signet.test', set)).toBe(true);
    expect(isAdminEmail('other@signet.test', set)).toBe(false);
    expect(isAdminEmail(null, set)).toBe(false);
    expect(isAdminEmail('', 'boss@signet.test')).toBe(false);
  });
});
