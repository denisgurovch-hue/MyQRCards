import { describe, expect, it } from 'vitest';
import type { CardDraft } from './card-draft';
import { buildCreateBody, buildSavePlan } from './save-card-v2';

function draft(partial: Partial<CardDraft> = {}): CardDraft {
  return {
    displayName: 'Name',
    jobTitle: '',
    companyName: '',
    summary: '',
    phone: '',
    email: '',
    showEmail: false,
    websiteUrl: '',
    links: [],
    contactOrder: ['phone', 'email', 'website'],
    photoUrl: null,
    coverColor: null,
    coverImageUrl: null,
    slug: 'name',
    status: 'draft',
    ...partial,
  };
}

describe('buildSavePlan', () => {
  it('maps text fields and ordered links into PATCH body', () => {
    const baseline = draft();
    const current = draft({
      displayName: 'Denis',
      phone: '+7999',
      links: [
        {
          id: 'a',
          label: 'TG',
          url: 'https://t.me/a',
          type: 'telegram',
        },
        {
          id: 'b',
          label: 'VK',
          url: 'https://vk.com/b',
          type: 'vk',
        },
      ],
      contactOrder: ['phone', 'b', 'email', 'website', 'a'],
    });
    const plan = buildSavePlan({
      draft: current,
      baseline,
      pendingPhotoBlob: null,
      pendingCoverBlob: null,
    });
    expect(plan.patch.displayName).toBe('Denis');
    expect(plan.patch.phone).toBe('+7999');
    expect(plan.patch.links).toEqual([
      { url: 'https://vk.com/b', label: 'VK', type: 'vk', position: 0 },
      { url: 'https://t.me/a', label: 'TG', type: 'telegram', position: 1 },
    ]);
    expect(plan.photo).toBe('keep');
    expect(plan.coverImage).toBe('keep');
  });

  it('plans photo upload/delete and cover delete when leaving image mode', () => {
    const baseline = draft({
      photoUrl: '/uploads/a.jpg',
      coverImageUrl: '/uploads/c.jpg',
    });
    const withUpload = buildSavePlan({
      draft: draft({ photoUrl: 'blob:preview' }),
      baseline,
      pendingPhotoBlob: new Blob(['x'], { type: 'image/jpeg' }),
      pendingCoverBlob: null,
    });
    expect(withUpload.photo).toBe('upload');

    const withDelete = buildSavePlan({
      draft: draft({ photoUrl: null, coverColor: '#0B1520' }),
      baseline,
      pendingPhotoBlob: null,
      pendingCoverBlob: null,
    });
    expect(withDelete.photo).toBe('delete');
    expect(withDelete.coverImage).toBe('delete');
    expect(withDelete.patch.coverColor).toBe('#0B1520');
  });
});

describe('buildCreateBody', () => {
  it('builds POST body and omits empty slug', () => {
    const plan = buildSavePlan({
      draft: draft({
        displayName: 'New Person',
        phone: '+7000',
        slug: '',
        coverColor: '#112233',
        links: [
          {
            id: 'a',
            label: 'TG',
            url: 'https://t.me/a',
            type: 'telegram',
          },
        ],
        contactOrder: ['phone', 'a', 'email', 'website'],
      }),
      baseline: draft({ displayName: '' }),
      pendingPhotoBlob: null,
      pendingCoverBlob: null,
    });
    const body = buildCreateBody(plan);
    expect(body).toEqual({
      displayName: 'New Person',
      phone: '+7000',
      showEmail: false,
      coverColor: '#112233',
      links: [
        {
          url: 'https://t.me/a',
          label: 'TG',
          type: 'telegram',
          position: 0,
        },
      ],
    });
    expect(body).not.toHaveProperty('slug');
  });

  it('includes slug when provided', () => {
    const plan = buildSavePlan({
      draft: draft({ displayName: 'Named', slug: 'my-slug-01' }),
      baseline: draft({ displayName: '' }),
      pendingPhotoBlob: null,
      pendingCoverBlob: null,
    });
    expect(buildCreateBody(plan).slug).toBe('my-slug-01');
  });
});
