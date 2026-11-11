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

describe('Public Cards API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
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
        displayName: 'Owner Account',
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
        displayName: 'Public Person',
        email: 'card@example.com',
        showEmail: false,
        slug: 'public-person-1',
        phone: '+79990001122',
        websiteUrl: 'https://example.com',
        links: [
          { label: 'B', url: 'https://b.example', position: 1 },
          { label: 'A', url: 'https://a.example', position: 0 },
        ],
        ...overrides,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    return created.body.card as { id: string; slug: string };
  }

  it('returns published card without auth and with Cache-Control no-store', async () => {
    const { cookies } = await register(`pub-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);

    expect(String(res.headers['cache-control'])).toMatch(/no-store/i);
    expect(res.body.card.slug).toBe(card.slug);
    expect(res.body.card.displayName).toBe('Public Person');
    expect(res.body.card.email).toBeNull();
    expect(res.body.card).not.toHaveProperty('userId');
    expect(res.body.card).not.toHaveProperty('showEmail');
    expect(res.body.card).not.toHaveProperty('status');
    expect(res.body.card).not.toHaveProperty('id');
    expect(res.body.card.links.map((l: { label: string }) => l.label)).toEqual([
      'A',
      'B',
    ]);
  });

  it('returns email only when showEmail=true and never account email', async () => {
    const { cookies } = await register(`mail-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, {
      slug: 'mail-card-slug',
      email: 'on-card@example.com',
      showEmail: true,
    });

    const shown = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    expect(shown.body.card.email).toBe('on-card@example.com');

    await request(app.getHttpServer())
      .patch(`/api/v1/cards/${card.id}`)
      .set('Cookie', cookies)
      .send({ showEmail: false })
      .expect(200);

    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    expect(hidden.body.card.email).toBeNull();
    expect(JSON.stringify(hidden.body)).not.toContain('on-card@example.com');
  });

  it('returns same 404 for draft, archived, deleted, unknown and invalid slug', async () => {
    const { cookies } = await register(`st-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Hidden', slug: 'hidden-card-1' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/hidden-card-1')
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe('CARD_NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/archive`)
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/hidden-card-1')
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/cards/${created.body.card.id}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/hidden-card-1')
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/no-such-slug-zz')
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/BAD')
      .expect(404);
  });

  it('freshness: unpublish makes next public request 404', async () => {
    const { cookies } = await register(`fresh-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, { slug: 'fresh-card-ok' });

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/unpublish`)
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(404);
  });
});
