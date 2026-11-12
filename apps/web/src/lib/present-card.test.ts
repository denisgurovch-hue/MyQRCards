import { describe, expect, it } from 'vitest';
import {
  PRESENT_PREVIEW_NOTICE,
  presentShareActions,
  toPresentCardView,
  type OwnerCardForPresent,
} from './present-card';

function baseCard(
  overrides: Partial<OwnerCardForPresent> = {},
): OwnerCardForPresent {
  return {
    id: 'card-1',
    displayName: 'Мария Орлова',
    jobTitle: 'Product',
    companyName: 'Signet',
    summary: 'Hello',
    phone: '+79991234567',
    email: 'maria@example.com',
    showEmail: true,
    websiteUrl: 'https://example.com',
    photoUrl: 'https://example.com/p.webp',
    slug: 'maria',
    status: 'published',
    links: [{ type: 'telegram', label: 'Telegram', url: 'https://t.me/maria' }],
    ...overrides,
  };
}

describe('toPresentCardView', () => {
  it('keeps email when showEmail=true', () => {
    const view = toPresentCardView(baseCard({ showEmail: true }));
    expect(view.email).toBe('maria@example.com');
    expect(view.canSharePublic).toBe(true);
  });

  it('hides email when showEmail=false even for owner', () => {
    const view = toPresentCardView(
      baseCard({ showEmail: false, email: 'secret@example.com' }),
    );
    expect(view.email).toBeNull();
  });

  it('never invents email when card email is empty', () => {
    const view = toPresentCardView(
      baseCard({ email: null, showEmail: true }),
    );
    expect(view.email).toBeNull();
  });

  it('marks draft as non-shareable', () => {
    const view = toPresentCardView(baseCard({ status: 'draft' }));
    expect(view.canSharePublic).toBe(false);
  });
});

describe('presentShareActions', () => {
  it('enables share actions only for published', () => {
    expect(presentShareActions('published')).toEqual({
      showQr: true,
      showPublicLink: true,
      showOpenPublic: true,
      showPreviewNotice: false,
    });
  });

  it('shows preview notice for draft and archived', () => {
    expect(presentShareActions('draft').showPreviewNotice).toBe(true);
    expect(presentShareActions('archived').showQr).toBe(false);
    expect(presentShareActions('archived').showPublicLink).toBe(false);
    expect(PRESENT_PREVIEW_NOTICE).toMatch(/не опубликована/);
  });
});
