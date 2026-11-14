import { CardEventType, CardStatus } from '@prisma/client';
import {
  AdminMetricsService,
  parseAdminMetricsPeriod,
} from './admin-metrics.service';

describe('AdminMetricsService', () => {
  const prisma = {
    user: { count: jest.fn() },
    card: { count: jest.fn(), groupBy: jest.fn() },
    cardEvent: { groupBy: jest.fn() },
    identity: { groupBy: jest.fn() },
  };

  const service = new AdminMetricsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses period query', () => {
    expect(parseAdminMetricsPeriod(undefined)).toBe('all');
    expect(parseAdminMetricsPeriod('7')).toBe('7');
    expect(parseAdminMetricsPeriod('30')).toBe('30');
    expect(() => parseAdminMetricsPeriod('90')).toThrow();
  });

  it('aggregates platform metrics without PII fields', async () => {
    prisma.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);
    prisma.card.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    prisma.card.groupBy.mockResolvedValue([
      { status: CardStatus.draft, _count: { _all: 2 } },
      { status: CardStatus.published, _count: { _all: 5 } },
      { status: CardStatus.archived, _count: { _all: 1 } },
    ]);
    prisma.cardEvent.groupBy.mockResolvedValue([
      { eventType: CardEventType.card_view, _count: { _all: 100 } },
      { eventType: CardEventType.contact_click, _count: { _all: 40 } },
      { eventType: CardEventType.vcard_download, _count: { _all: 12 } },
    ]);
    prisma.identity.groupBy.mockResolvedValue([
      { provider: 'vkid', _count: { _all: 3 } },
      { provider: 'yandex', _count: { _all: 2 } },
    ]);

    const metrics = await service.getMetrics('all');
    expect(metrics.usersTotal).toBe(10);
    expect(metrics.usersNew).toBe(2);
    expect(metrics.cardsTotal).toBe(8);
    expect(metrics.cardsNew).toBe(3);
    expect(metrics.cardsByStatus).toEqual({
      draft: 2,
      published: 5,
      archived: 1,
    });
    expect(metrics.cardsPublishedNow).toBe(5);
    expect(metrics.eventsViews).toBe(100);
    expect(metrics.eventsClicks).toBe(40);
    expect(metrics.eventsVcard).toBe(12);
    expect(metrics.authProviders).toEqual({
      password: 4,
      vkid: 3,
      yandex: 2,
      other: 0,
    });
    expect(JSON.stringify(metrics)).not.toMatch(/@/);
  });
});
