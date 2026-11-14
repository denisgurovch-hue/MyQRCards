import { describe, expect, it } from 'vitest';
import { resolveContactKind } from './contact-icon';

describe('resolveContactKind', () => {
  it('maps phone and email', () => {
    expect(resolveContactKind({ key: 'phone' })).toBe('phone');
    expect(resolveContactKind({ channel: 'email' })).toBe('email');
    expect(resolveContactKind({ url: 'tel:+79991234567' })).toBe('phone');
    expect(resolveContactKind({ url: 'mailto:a@b.c' })).toBe('email');
  });

  it('does not treat telegram as phone because of "tel" substring', () => {
    expect(resolveContactKind({ type: 'telegram' })).toBe('telegram');
    expect(resolveContactKind({ channel: 'telegram' })).toBe('telegram');
    expect(resolveContactKind({ url: 'https://t.me/maria' })).toBe('telegram');
    expect(resolveContactKind({ type: 'Telegram' })).toBe('telegram');
  });

  it('detects messenger and social hosts from url', () => {
    expect(resolveContactKind({ url: 'https://wa.me/79991234567' })).toBe(
      'whatsapp',
    );
    expect(resolveContactKind({ url: 'https://max.ru/u/example' })).toBe('max');
    expect(resolveContactKind({ url: 'https://vk.com/id1' })).toBe('vk');
    expect(resolveContactKind({ type: 'linkedin' })).toBe('linkedin');
    expect(
      resolveContactKind({
        type: 'link',
        url: 'https://www.linkedin.com/in/example',
      }),
    ).toBe('linkedin');
  });

  it('auto-detects common networks when type is generic link', () => {
    expect(
      resolveContactKind({ type: 'link', url: 'https://youtube.com/@ch' }),
    ).toBe('youtube');
    expect(
      resolveContactKind({ type: 'link', url: 'https://youtu.be/abc' }),
    ).toBe('youtube');
    expect(
      resolveContactKind({ type: 'link', url: 'https://github.com/org/repo' }),
    ).toBe('github');
    expect(
      resolveContactKind({ type: 'link', url: 'https://tenchat.ru/user' }),
    ).toBe('tenchat');
    expect(
      resolveContactKind({ type: 'link', url: 'https://dzen.ru/a/xyz' }),
    ).toBe('dzen');
    expect(
      resolveContactKind({ type: 'link', url: 'https://rutube.ru/channel/1' }),
    ).toBe('rutube');
    expect(
      resolveContactKind({ type: 'link', url: 'https://behance.net/name' }),
    ).toBe('behance');
    expect(
      resolveContactKind({
        type: 'link',
        url: 'https://instagram.com/name',
      }),
    ).toBe('instagram');
  });

  it('falls back to website/link', () => {
    expect(resolveContactKind({ key: 'website', url: 'https://example.com' })).toBe(
      'website',
    );
    expect(resolveContactKind({ type: 'other' })).toBe('link');
    expect(
      resolveContactKind({ type: 'link', url: 'https://example.com' }),
    ).toBe('website');
  });
});
