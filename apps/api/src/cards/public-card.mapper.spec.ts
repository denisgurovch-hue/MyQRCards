import { CardStatus } from '@prisma/client';
import { toPublicCardDto } from './public-card.mapper';

function baseCard(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    displayName: 'Ivan',
    jobTitle: 'Lead',
    companyName: 'Co',
    summary: 'Hello',
    phone: '+7999',
    email: 'card@example.com',
    showEmail: false,
    websiteUrl: 'https://example.com',
    photoUrl: null,
    coverColor: null,
    coverImageUrl: null,
    photoId: null,
    coverPhotoId: null,
    slug: 'ivan-ivanov',
    status: CardStatus.published,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    links: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        cardId: '11111111-1111-4111-8111-111111111111',
        label: 'Site',
        url: 'https://a.example',
        type: 'website',
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        cardId: '11111111-1111-4111-8111-111111111111',
        label: 'TG',
        url: 'https://t.me/x',
        type: 'telegram',
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

describe('toPublicCardDto', () => {
  it('allowlists public fields and sorts links by position', () => {
    const dto = toPublicCardDto(baseCard() as never);
    expect(Object.keys(dto).sort()).toEqual(
      [
        'companyName',
        'coverColor',
        'coverImageUrl',
        'displayName',
        'email',
        'jobTitle',
        'links',
        'phone',
        'photoUrl',
        'slug',
        'summary',
        'websiteUrl',
      ].sort(),
    );
    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('showEmail');
    expect(dto).not.toHaveProperty('status');
    expect(dto).not.toHaveProperty('id');
    expect(dto.email).toBeNull();
    expect(dto.links.map((l) => l.label)).toEqual(['TG', 'Site']);
  });

  it('exposes email only when showEmail is true', () => {
    const hidden = toPublicCardDto(baseCard({ showEmail: false }) as never);
    const shown = toPublicCardDto(baseCard({ showEmail: true }) as never);
    expect(hidden.email).toBeNull();
    expect(shown.email).toBe('card@example.com');
  });
});
