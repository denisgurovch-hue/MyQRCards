import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { CardEventType } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { AppError } from '../src/common/errors/app-error';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { VkidClient } from '../src/auth/vkid/vkid.client';
import { AnalyticsService } from '../src/cards/analytics.service';

describe('Card analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    process.env.WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VkidClient)
      .useValue({
        authorizeUrl: jest.fn(),
        exchangeCode: jest.fn(),
        fetchUserInfo: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new AppError(
            'VALIDATION_ERROR',
            'Request validation failed',
            HttpStatus.BAD_REQUEST,
            errors.map((error) => ({
              field: error.property,
              constraints: error.constraints,
            })),
          ),
      }),
    );
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'readyz', method: RequestMethod.GET }],
    });
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cardEvent.deleteMany();
    await prisma.cardLink.deleteMany();
    await prisma.card.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.user.deleteMany();
    await redis.deleteByPrefix('rl:');
  });

  async function register(email: string) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'StrongPassphrase123!',
        displayName: 'Analytics Owner',
      })
      .expect(201);
    return {
      cookies: res.headers['set-cookie'] as unknown as string[],
      userId: res.body.user.id as string,
    };
  }

  async function createPublishedCard(
    cookies: string[],
    overrides: Record<string, unknown> = {},
  ) {
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({
        displayName: 'Analytics Person',
        email: 'analytics@example.com',
        showEmail: true,
        slug: 'analytics-person-1',
        phone: '+79990001122',
        websiteUrl: 'https://example.com',
        links: [
          {
            label: 'Telegram',
            url: 'https://t.me/example',
            type: 'telegram',
            position: 0,
          },
          {
            label: 'WhatsApp',
            url: 'https://wa.me/79990001122',
            type: 'whatsapp',
            position: 1,
          },
        ],
        ...overrides,
      })
      .expect(201);

    const cardId = created.body.card.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/cards/${cardId}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    return created.body.card as { id: string; slug: string };
  }

  async function waitForEvents(cardId: string, minCount: number) {
    for (let i = 0; i < 40; i += 1) {
      const count = await prisma.cardEvent.count({ where: { cardId } });
      if (count >= minCount) {
        return;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Expected at least ${minCount} events for card`);
  }

  it('records card_view only for successful published GET', async () => {
    const { cookies } = await register('owner-view@example.com');
    const card = await createPublishedCard(cookies);

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    await waitForEvents(card.id, 1);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/no-such-slug-zz')
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/unpublish`)
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(404);

    const events = await prisma.cardEvent.findMany({
      where: { cardId: card.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(CardEventType.card_view);
    expect(events[0]?.channel).toBeNull();
    expect(events[0]?.visitorHash).toBeNull();
  });

  it('records contact_click channels and vcard_download', async () => {
    const { cookies } = await register('owner-click@example.com');
    const card = await createPublishedCard(cookies, {
      slug: 'analytics-clicks-1',
    });

    for (const channel of [
      'phone',
      'email',
      'whatsapp',
      'telegram',
      'link',
    ] as const) {
      await request(app.getHttpServer())
        .post(`/api/v1/public/cards/${card.slug}/clicks`)
        .send({ channel })
        .expect(204);
    }

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}/vcard`)
      .expect(200);
    await waitForEvents(card.id, 6);

    const clicks = await prisma.cardEvent.findMany({
      where: {
        cardId: card.id,
        eventType: CardEventType.contact_click,
      },
      orderBy: { occurredAt: 'asc' },
    });
    expect(clicks.map((e) => e.channel)).toEqual([
      'phone',
      'email',
      'whatsapp',
      'telegram',
      'link',
    ]);

    const vcard = await prisma.cardEvent.findFirst({
      where: {
        cardId: card.id,
        eventType: CardEventType.vcard_download,
      },
    });
    expect(vcard?.channel).toBe('vcard');
  });

  it('owner analytics aggregates and denies foreign/anonymous access', async () => {
    const owner = await register('owner-agg@example.com');
    const other = await register('other-agg@example.com');
    const card = await createPublishedCard(owner.cookies, {
      slug: 'analytics-agg-1',
    });

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/public/cards/${card.slug}/clicks`)
      .send({ channel: 'phone' })
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}/vcard`)
      .expect(200);
    await waitForEvents(card.id, 3);

    const res7 = await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.id}/analytics?period=7d`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect(res7.body.period).toBe('7d');
    expect(res7.body.totals).toEqual({
      card_views: 1,
      contact_clicks: 1,
      vcard_downloads: 1,
    });
    expect(res7.body.by_channel.phone).toBe(1);
    expect(res7.body.daily).toHaveLength(7);
    const sumViews = res7.body.daily.reduce(
      (n: number, d: { card_views: number }) => n + d.card_views,
      0,
    );
    expect(sumViews).toBe(1);

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.id}/analytics?period=30d`)
      .set('Cookie', owner.cookies)
      .expect(200)
      .expect((res) => {
        expect(res.body.period).toBe('30d');
        expect(res.body.daily).toHaveLength(30);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.id}/analytics`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.id}/analytics?period=7d`)
      .set('Cookie', other.cookies)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.id}/analytics?period=14d`)
      .set('Cookie', owner.cookies)
      .expect(400);
  });

  it('analytics write failure does not break public card or vcard', async () => {
    const { cookies } = await register('owner-failsoft@example.com');
    const card = await createPublishedCard(cookies, {
      slug: 'analytics-failsoft-1',
    });

    const analytics = app.get(AnalyticsService);
    const spy = jest
      .spyOn(analytics, 'recordSafe')
      .mockRejectedValue(new Error('forced analytics failure'));

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}/vcard`)
      .expect(200);

    spy.mockRestore();
  });
});
