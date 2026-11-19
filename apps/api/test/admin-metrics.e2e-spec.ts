import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppError } from '../src/common/errors/app-error';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { VkidClient } from '../src/auth/vkid/vkid.client';
import { YandexIdClient } from '../src/auth/yandex/yandex-id.client';
import { CardEventType, CardStatus } from '@prisma/client';

describe('Admin metrics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  const adminEmail = `admin-${Date.now()}@example.com`;
  const previousAdminEnv = process.env.ADMIN_USER_EMAILS;

  beforeAll(async () => {
    process.env.ADMIN_USER_EMAILS = adminEmail;
    process.env.WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VkidClient)
      .useValue({
        isConfigured: jest.fn(() => false),
        authorizeUrl: jest.fn(),
        exchangeCode: jest.fn(),
        fetchUserInfo: jest.fn(),
      })
      .overrideProvider(YandexIdClient)
      .useValue({
        isConfigured: jest.fn(() => false),
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
    if (previousAdminEnv === undefined) {
      delete process.env.ADMIN_USER_EMAILS;
    } else {
      process.env.ADMIN_USER_EMAILS = previousAdminEnv;
    }
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cardEvent.deleteMany();
    await prisma.cardLink.deleteMany();
    await prisma.card.updateMany({
      data: { photoId: null, photoUrl: null, coverPhotoId: null },
    });
    await prisma.cardPhoto.deleteMany();
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
        password: 'StrongPassphrase123!', lastName: 'Test', firstName: 'User',
      })
      .expect(201);
    return {
      cookies: res.headers['set-cookie'] as unknown as string[],
      userId: res.body.user.id as string,
    };
  }

  it('rejects anonymous and non-admin access', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .expect(401);

    const user = await register(`user-${Date.now()}@example.com`);
    const denied = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .set('Cookie', user.cookies)
      .expect(403);
    expect(denied.body.error.code).toBe('ADMIN_FORBIDDEN');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', user.cookies)
      .expect(200);
    expect(me.body.user.isAdmin).toBe(false);
  });

  it('returns aggregates for allowlisted admin', async () => {
    const admin = await register(adminEmail);
    const other = await register(`other-${Date.now()}@example.com`);

    const published = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', admin.cookies)
      .send({ displayName: 'Admin Card', slug: 'admin-card-1' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/cards/${published.body.card.id}/publish`)
      .set('Cookie', admin.cookies)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', other.cookies)
      .send({ displayName: 'Draft Card', slug: 'draft-card-1' })
      .expect(201);

    const soft = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', other.cookies)
      .send({ displayName: 'Deleted', slug: 'deleted-card-1' })
      .expect(201);
    await prisma.card.update({
      where: { id: soft.body.card.id },
      data: { deletedAt: new Date() },
    });

    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    await prisma.cardEvent.createMany({
      data: [
        {
          cardId: published.body.card.id,
          eventType: CardEventType.card_view,
          day,
        },
        {
          cardId: published.body.card.id,
          eventType: CardEventType.card_view,
          day,
        },
        {
          cardId: published.body.card.id,
          eventType: CardEventType.contact_click,
          channel: 'phone',
          day,
        },
        {
          cardId: published.body.card.id,
          eventType: CardEventType.vcard_download,
          channel: 'vcard',
          day,
        },
      ],
    });

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', admin.cookies)
      .expect(200);
    expect(me.body.user.isAdmin).toBe(true);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics')
      .set('Cookie', admin.cookies)
      .expect(200);

    expect(res.body.period).toBe('all');
    expect(res.body.usersTotal).toBe(2);
    expect(res.body.cardsTotal).toBe(2);
    expect(res.body.cardsByStatus.published).toBe(1);
    expect(res.body.cardsByStatus.draft).toBe(1);
    expect(res.body.cardsPublishedNow).toBe(1);
    expect(res.body.eventsViews).toBe(2);
    expect(res.body.eventsClicks).toBe(1);
    expect(res.body.eventsVcard).toBe(1);
    expect(res.body.authProviders.password).toBe(2);
    expect(JSON.stringify(res.body)).not.toContain(adminEmail);
    expect(JSON.stringify(res.body)).not.toContain(other.userId);

    const week = await request(app.getHttpServer())
      .get('/api/v1/admin/metrics?period=7')
      .set('Cookie', admin.cookies)
      .expect(200);
    expect(week.body.period).toBe('7');
    expect(week.body.eventsViews).toBe(2);

    await request(app.getHttpServer())
      .get('/api/v1/admin/metrics?period=90')
      .set('Cookie', admin.cookies)
      .expect(400);

    // sanity: published card still exists as published
    expect(
      await prisma.card.count({
        where: { status: CardStatus.published, deletedAt: null },
      }),
    ).toBe(1);
  });
});
