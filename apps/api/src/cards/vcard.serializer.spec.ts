import vCard from 'vcf';
import {
  buildVCard30,
  escapeVCardText,
  foldVCardLine,
} from './vcard.serializer';

function parseOne(raw: string) {
  const cards = vCard.parse(raw);
  expect(cards).toHaveLength(1);
  return cards[0];
}

describe('vcard.serializer', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeVCardText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });

  it('folds long lines on octet boundaries without splitting UTF-8', () => {
    const cyrillic = 'Ж'.repeat(80);
    const folded = foldVCardLine(`NOTE:${cyrillic}`);
    expect(folded.includes('\r\n ')).toBe(true);
    for (const physical of folded.split('\r\n')) {
      expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('builds parseable vCard 3.0 with FN/N fallback and optional fields', () => {
    const raw = buildVCard30({
      displayName: 'Иван Иванов',
      jobTitle: 'Руководитель',
      companyName: 'Компания',
      summary: 'Цифровизация\nлогистики',
      phone: '+79990001122',
      email: 'card@example.com',
      websiteUrl: 'https://example.com',
      canonicalUrl: 'https://cards.example/u/ivan-ivanov',
    });

    expect(raw.startsWith('BEGIN:VCARD\r\n')).toBe(true);
    expect(raw.includes('VERSION:3.0\r\n')).toBe(true);
    expect(raw.endsWith('END:VCARD\r\n')).toBe(true);

    const card = parseOne(raw);
    expect(card.get('fn').valueOf()).toBe('Иван Иванов');
    expect(card.get('n').valueOf()).toBe('Иван Иванов;;;;');
    expect(card.get('org').valueOf()).toBe('Компания');
    expect(card.get('title').valueOf()).toBe('Руководитель');
    expect(card.get('tel').valueOf()).toBe('+79990001122');
    expect(card.get('email').valueOf()).toBe('card@example.com');
    expect(card.get('note').valueOf()).toContain('Цифровизация');
  });

  it('omits empty optionals and hidden email', () => {
    const raw = buildVCard30({
      displayName: 'Only Name',
      jobTitle: null,
      companyName: '  ',
      summary: null,
      phone: null,
      email: null,
      websiteUrl: null,
      canonicalUrl: 'https://cards.example/u/only-name',
    });

    expect(raw).not.toMatch(/EMAIL/i);
    expect(raw).not.toMatch(/TEL/i);
    expect(raw).not.toMatch(/ORG/i);
    expect(raw).not.toMatch(/TITLE/i);
    expect(raw).not.toMatch(/NOTE/i);
    expect(raw).toContain('URL:https://cards.example/u/only-name');
  });

  it('blocks property injection via newlines in displayName', () => {
    const raw = buildVCard30({
      displayName: 'Evil\nEMAIL;TYPE=INTERNET:attacker@evil.test',
      jobTitle: null,
      companyName: null,
      summary: null,
      phone: null,
      email: null,
      websiteUrl: null,
      canonicalUrl: 'https://cards.example/u/evil-name',
    });

    const card = parseOne(raw);
    expect(card.get('email')).toBeUndefined();
    expect(String(card.get('fn').valueOf())).toContain('Evil');
    expect(raw).not.toMatch(/\r\nEMAIL;TYPE=INTERNET:attacker@evil\.test\r\n/);
  });

  it('rejects unsafe website URLs but keeps canonical URL', () => {
    const raw = buildVCard30({
      displayName: 'Safe',
      jobTitle: null,
      companyName: null,
      summary: null,
      phone: null,
      email: null,
      websiteUrl: 'javascript:alert(1)',
      canonicalUrl: 'https://cards.example/u/safe',
    });

    expect(raw).not.toContain('javascript:');
    expect(raw).toContain('URL:https://cards.example/u/safe');
  });

  it('handles emoji and long UTF-8 note values', () => {
    const note = `Привет 👋 ${'я'.repeat(120)}`;
    const raw = buildVCard30({
      displayName: 'Emoji User 🚀',
      jobTitle: null,
      companyName: null,
      summary: note,
      phone: null,
      email: null,
      websiteUrl: null,
      canonicalUrl: 'https://cards.example/u/emoji-user',
    });

    const card = parseOne(raw);
    expect(card.get('fn').valueOf()).toBe('Emoji User 🚀');
    expect(String(card.get('note').valueOf())).toContain('Привет');
  });
});
