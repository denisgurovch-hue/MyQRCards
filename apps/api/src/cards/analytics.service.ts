import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CardEventType, CardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import {
  type AnalyticsPeriod,
  type ContactClickChannel,
  isAnalyticsPeriod,
  periodDays,
  utcDayDate,
  utcDayString,
} from './analytics.channels';
import { isValidSlug, normalizeSlug } from './slug.util';

export type AnalyticsResponse = {
  period: AnalyticsPeriod;
  totals: {
    card_views: number;
    contact_clicks: number;
    vcard_downloads: number;
  };
  by_channel: {
    phone: number;
    email: number;
    whatsapp: number;
    telegram: number;
    link: number;
  };
  daily: Array<{
    date: string;
    card_views: number;
    contact_clicks: number;
    vcard_downloads: number;
  }>;
};

type DailyBucket = {
  card_views: number;
  contact_clicks: number;
  vcard_downloads: number;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget safe write. Never throws to callers of public flows.
   * Does not store IP, User-Agent, URL query, or other PII.
   */
  async recordSafe(input: {
    cardId: string;
    eventType: CardEventType;
    channel: string | null;
  }): Promise<void> {
    try {
      const now = new Date();
      await this.prisma.cardEvent.create({
        data: {
          cardId: input.cardId,
          eventType: input.eventType,
          channel: input.channel,
          occurredAt: now,
          day: utcDayDate(now),
          visitorHash: null,
        },
      });
    } catch {
      this.logger.warn(
        `Analytics write failed for ${input.eventType}; public flow continues`,
      );
    }
  }

  recordCardView(cardId: string): void {
    void this.recordSafe({
      cardId,
      eventType: CardEventType.card_view,
      channel: null,
    }).catch(() => undefined);
  }

  recordVcardDownload(cardId: string): void {
    void this.recordSafe({
      cardId,
      eventType: CardEventType.vcard_download,
      channel: 'vcard',
    }).catch(() => undefined);
  }

  async recordContactClickBySlug(
    rawSlug: string,
    channel: ContactClickChannel,
  ): Promise<void> {
    const slug = normalizeSlug(rawSlug ?? '');
    if (!isValidSlug(slug)) {
      throw new AppError(
        'CARD_NOT_FOUND',
        'Card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const card = await this.prisma.card.findFirst({
      where: {
        slug,
        status: CardStatus.published,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!card) {
      throw new AppError(
        'CARD_NOT_FOUND',
        'Card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.recordSafe({
      cardId: card.id,
      eventType: CardEventType.contact_click,
      channel,
    });
  }

  async getForOwner(
    userId: string,
    cardId: string,
    periodRaw: string | undefined,
  ): Promise<AnalyticsResponse> {
    let period: AnalyticsPeriod = '7d';
    if (periodRaw !== undefined && periodRaw !== '') {
      if (!isAnalyticsPeriod(periodRaw)) {
        throw new AppError(
          'VALIDATION_ERROR',
          'period must be 7d or 30d',
          HttpStatus.BAD_REQUEST,
        );
      }
      period = periodRaw;
    }

    const owned = await this.prisma.card.findFirst({
      where: { id: cardId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!owned) {
      throw new AppError('NOT_FOUND', 'Card not found', HttpStatus.NOT_FOUND);
    }

    return this.aggregate(owned.id, period);
  }

  async aggregate(
    cardId: string,
    period: AnalyticsPeriod,
  ): Promise<AnalyticsResponse> {
    const days = periodDays(period);
    const end = new Date();
    const startDay = utcDayDate(
      new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate() - (days - 1),
        ),
      ),
    );
    const endExclusive = utcDayDate(
      new Date(
        Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate() + 1,
        ),
      ),
    );

    const events = await this.prisma.cardEvent.findMany({
      where: {
        cardId,
        day: { gte: startDay, lt: endExclusive },
      },
      select: {
        eventType: true,
        channel: true,
        day: true,
      },
    });

    const totals: DailyBucket = {
      card_views: 0,
      contact_clicks: 0,
      vcard_downloads: 0,
    };
    const by_channel = {
      phone: 0,
      email: 0,
      whatsapp: 0,
      telegram: 0,
      link: 0,
    };
    const dailyMap = new Map<string, DailyBucket>();

    for (let i = 0; i < days; i += 1) {
      const d = new Date(startDay);
      d.setUTCDate(startDay.getUTCDate() + i);
      dailyMap.set(utcDayString(d), {
        card_views: 0,
        contact_clicks: 0,
        vcard_downloads: 0,
      });
    }

    for (const event of events) {
      const key = utcDayString(event.day);
      let mutable = dailyMap.get(key);
      if (!mutable) {
        mutable = {
          card_views: 0,
          contact_clicks: 0,
          vcard_downloads: 0,
        };
        dailyMap.set(key, mutable);
      }

      if (event.eventType === CardEventType.card_view) {
        totals.card_views += 1;
        mutable.card_views += 1;
      } else if (event.eventType === CardEventType.contact_click) {
        totals.contact_clicks += 1;
        mutable.contact_clicks += 1;
        if (event.channel && event.channel in by_channel) {
          by_channel[event.channel as keyof typeof by_channel] += 1;
        }
      } else if (event.eventType === CardEventType.vcard_download) {
        totals.vcard_downloads += 1;
        mutable.vcard_downloads += 1;
      }
    }

    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return { period, totals, by_channel, daily };
  }
}
