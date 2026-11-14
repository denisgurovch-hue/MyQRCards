import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CardEventType, CardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

export type AdminMetricsPeriod = '7' | '30' | 'all';

export type AdminMetricsResponse = {
  period: AdminMetricsPeriod;
  usersTotal: number;
  usersNew: number;
  cardsTotal: number;
  cardsNew: number;
  cardsByStatus: {
    draft: number;
    published: number;
    archived: number;
  };
  cardsPublishedNow: number;
  eventsViews: number;
  eventsClicks: number;
  eventsVcard: number;
  authProviders: {
    password: number;
    vkid: number;
    yandex: number;
    other: number;
  };
};

function utcDayDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function periodStart(period: AdminMetricsPeriod): Date | null {
  if (period === 'all') {
    return null;
  }
  const days = period === '7' ? 7 : 30;
  const end = new Date();
  return utcDayDate(
    new Date(
      Date.UTC(
        end.getUTCFullYear(),
        end.getUTCMonth(),
        end.getUTCDate() - (days - 1),
      ),
    ),
  );
}

export function parseAdminMetricsPeriod(
  raw: string | undefined,
): AdminMetricsPeriod {
  if (raw === undefined || raw === '' || raw === 'all') {
    return 'all';
  }
  if (raw === '7' || raw === '30') {
    return raw;
  }
  throw new AppError(
    'VALIDATION_ERROR',
    'period must be 7, 30, or all',
    HttpStatus.BAD_REQUEST,
  );
}

@Injectable()
export class AdminMetricsService {
  private readonly logger = new Logger(AdminMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(period: AdminMetricsPeriod): Promise<AdminMetricsResponse> {
    const since = periodStart(period);
    const activeCard = { deletedAt: null as Date | null };

    const [
      usersTotal,
      usersNew,
      cardsTotal,
      cardsNew,
      statusGroups,
      eventGroups,
      passwordUsers,
      identityGroups,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      this.prisma.card.count({ where: activeCard }),
      this.prisma.card.count({
        where: {
          ...activeCard,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.card.groupBy({
        by: ['status'],
        where: activeCard,
        _count: { _all: true },
      }),
      this.prisma.cardEvent.groupBy({
        by: ['eventType'],
        where: since ? { day: { gte: since } } : undefined,
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: { passwordHash: { not: null } },
      }),
      this.prisma.identity.groupBy({
        by: ['provider'],
        _count: { _all: true },
      }),
    ]);

    const cardsByStatus = {
      draft: 0,
      published: 0,
      archived: 0,
    };
    for (const row of statusGroups) {
      if (row.status === CardStatus.draft) {
        cardsByStatus.draft = row._count._all;
      } else if (row.status === CardStatus.published) {
        cardsByStatus.published = row._count._all;
      } else if (row.status === CardStatus.archived) {
        cardsByStatus.archived = row._count._all;
      }
    }

    let eventsViews = 0;
    let eventsClicks = 0;
    let eventsVcard = 0;
    for (const row of eventGroups) {
      if (row.eventType === CardEventType.card_view) {
        eventsViews = row._count._all;
      } else if (row.eventType === CardEventType.contact_click) {
        eventsClicks = row._count._all;
      } else if (row.eventType === CardEventType.vcard_download) {
        eventsVcard = row._count._all;
      }
    }

    const authProviders = {
      password: passwordUsers,
      vkid: 0,
      yandex: 0,
      other: 0,
    };
    for (const row of identityGroups) {
      if (row.provider === 'vkid') {
        authProviders.vkid = row._count._all;
      } else if (row.provider === 'yandex') {
        authProviders.yandex = row._count._all;
      } else {
        authProviders.other += row._count._all;
      }
    }

    this.logger.log('Admin metrics read');

    return {
      period,
      usersTotal,
      usersNew,
      cardsTotal,
      cardsNew,
      cardsByStatus,
      cardsPublishedNow: cardsByStatus.published,
      eventsViews,
      eventsClicks,
      eventsVcard,
      authProviders,
    };
  }
}
