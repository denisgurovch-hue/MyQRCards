import { describe, expect, it } from 'vitest';
import { resolveContactKind } from './contact-icon';

describe('resolveContactKind', () => {
  it('maps phone and email', () => {
    expect(resolveContactKind({ key: 'phone' })).toBe('phone');
    expect(resolveContactKind({ channel: 'email' })).toBe('email');
    expect(resolveContactKind({ url: 'tel:+79991234567' })).toBe('phone');
  });

  it('does not treat telegram as phone because of "tel" substring', () => {
    expect(resolveContactKind({ type: 'telegram' })).toBe('telegram');
    expect(resolveContactKind({ channel: 'telegram' })).toBe('telegram');
    expect(resolveContactKind({ url: 'https://t.me/maria' })).toBe('telegram');
    expect(resolveContactKind({ type: 'Telegram' })).toBe('telegram');
  });

  it('detects linkedin from url/type', () => {
    expect(resolveContactKind({ type: 'linkedin' })).toBe('linkedin');
  });

  it('falls back to website/link', () => {
    expect(resolveContactKind({ key: 'website', url: 'https://example.com' })).toBe(
      'website',
    );
    expect(resolveContactKind({ type: 'other' })).toBe('link');
  });
});
