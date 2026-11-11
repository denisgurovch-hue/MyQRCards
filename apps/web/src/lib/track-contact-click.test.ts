import { describe, expect, it } from 'vitest';
import { resolveContactChannel } from './track-contact-click';

describe('resolveContactChannel', () => {
  it('maps phone and email', () => {
    expect(resolveContactChannel({ kind: 'phone' })).toBe('phone');
    expect(resolveContactChannel({ kind: 'email' })).toBe('email');
  });

  it('maps whatsapp and telegram from type or url', () => {
    expect(
      resolveContactChannel({
        kind: 'link',
        type: 'whatsapp',
        url: 'https://example.com',
      }),
    ).toBe('whatsapp');
    expect(
      resolveContactChannel({
        kind: 'link',
        url: 'https://t.me/hello',
      }),
    ).toBe('telegram');
    expect(
      resolveContactChannel({
        kind: 'website',
        url: 'https://example.com/about',
      }),
    ).toBe('link');
  });
});
