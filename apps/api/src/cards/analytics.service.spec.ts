import { CardEventType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    cardEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
    },
  };

  const service = new AnalyticsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recordSafe swallows write errors', async () => {
    prisma.cardEvent.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.recordSafe({
        cardId: 'card-1',
        eventType: CardEventType.card_view,
        channel: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('aggregate fills daily buckets and by_channel', async () => {
    const today = new Date();
    const day = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    prisma.cardEvent.findMany.mockResolvedValue([
      { eventType: CardEventType.card_view, channel: null, day },
      { eventType: CardEventType.card_view, channel: null, day },
      {
        eventType: CardEventType.contact_click,
        channel: 'phone',
        day,
      },
      {
        eventType: CardEventType.contact_click,
        channel: 'whatsapp',
        day,
      },
      {
        eventType: CardEventType.vcard_download,
        channel: 'vcard',
        day,
      },
    ]);

    const result = await service.aggregate('card-1', '7d');
    expect(result.period).toBe('7d');
    expect(result.totals).toEqual({
      card_views: 2,
      contact_clicks: 2,
      vcard_downloads: 1,
    });
    expect(result.by_channel).toEqual({
      phone: 1,
      email: 0,
      whatsapp: 1,
      telegram: 0,
      link: 0,
    });
    expect(result.daily).toHaveLength(7);
    const sumViews = result.daily.reduce((n, d) => n + d.card_views, 0);
    const sumClicks = result.daily.reduce((n, d) => n + d.contact_clicks, 0);
    const sumVcard = result.daily.reduce((n, d) => n + d.vcard_downloads, 0);
    expect(sumViews).toBe(result.totals.card_views);
    expect(sumClicks).toBe(result.totals.contact_clicks);
    expect(sumVcard).toBe(result.totals.vcard_downloads);
  });

  it('getForOwner returns 404 for foreign card', async () => {
    prisma.card.findFirst.mockResolvedValue(null);
    await expect(service.getForOwner('user-1', 'card-x', '7d')).rejects.toEqual(
      expect.objectContaining({
        getStatus: expect.any(Function),
      }),
    );
    try {
      await service.getForOwner('user-1', 'card-x', '7d');
    } catch (error) {
      expect((error as { getStatus: () => number }).getStatus()).toBe(404);
    }
  });
});
