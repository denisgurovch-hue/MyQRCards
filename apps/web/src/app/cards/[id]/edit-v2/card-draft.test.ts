import { describe, expect, it } from 'vitest';
import { ownerCardToDraft, normalizeLinkType } from './card-draft';

describe('ownerCardToDraft', () => {
  it('normalizes nullables and link types/order', () => {
    const draft = ownerCardToDraft({
      id: '1',
      displayName: 'A',
      jobTitle: null,
      companyName: null,
      summary: null,
      phone: null,
      email: null,
      showEmail: true,
      websiteUrl: null,
      photoUrl: null,
      coverColor: '#ABC',
      coverImageUrl: null,
      slug: 'a',
      status: 'published',
      links: [
        {
          id: 'l2',
          label: null,
          url: 'https://vk.com/x',
          type: 'vk',
          position: 1,
        },
        {
          id: 'l1',
          label: 'TG',
          url: 'https://t.me/x',
          type: 'telegram',
          position: 0,
        },
      ],
    });
    expect(draft.jobTitle).toBe('');
    expect(draft.showEmail).toBe(true);
    expect(draft.coverColor).toBe('#ABC');
    expect(draft.links.map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(draft.contactOrder).toEqual(['phone', 'email', 'website', 'l1', 'l2']);
  });
});

describe('normalizeLinkType', () => {
  it('falls back to link', () => {
    expect(normalizeLinkType('max')).toBe('max');
    expect(normalizeLinkType('Other')).toBe('link');
  });
});
