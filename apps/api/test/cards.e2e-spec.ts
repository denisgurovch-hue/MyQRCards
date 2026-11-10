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

describe('Cards API (e2e)', () => {
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
    await redis.deleteByPrefix('rl:');
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
        displayName: 'Owner',
      })
      .expect(201);
    return {
      cookies: res.headers['set-cookie'] as unknown as string[],
      userId: res.body.user.id as string,
    };
  }

  it('requires auth to create a card', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .send({ displayName: 'Denis' })
      .expect(401);
  });

  it('creates a draft card with defaults, generated slug and ordered links', async () => {
    const { cookies } = await register(`a-${Date.now()}@example.com`);

    const res = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({
        displayName: 'Denis Gurov',
        links: [
          { label: 'Site', url: 'https://example.com', position: 1 },
          { label: 'TG', url: 'https://t.me/denis', position: 0 },
        ],
      })
      .expect(201);

    expect(res.body.card.status).toBe('draft');
    expect(res.body.card.showEmail).toBe(false);
    expect(res.body.card.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(res.body.card.links.map((l: { label: string }) => l.label)).toEqual([
      'TG',
      'Site',
    ]);
  });

  it('validates displayName and rejects mass-assignment of userId/status', async () => {
    const { cookies, userId } = await register(`b-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({})
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    const other = await register(`c-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({
        displayName: 'Safe',
        userId: other.userId,
        status: 'published',
        showEmail: true,
      })
      .expect(400);

    expect(created.body.error.code).toBe('VALIDATION_ERROR');

    const ok = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Safe', showEmail: true, slug: 'safe-card-slug' })
      .expect(201);

    expect(ok.body.card.status).toBe('draft');
    expect(ok.body.card.showEmail).toBe(true);

    const row = await prisma.card.findUniqueOrThrow({
      where: { id: ok.body.card.id },
    });
    expect(row.userId).toBe(userId);
  });

  it('returns 409 for duplicate slug', async () => {
    const { cookies } = await register(`d-${Date.now()}@example.com`);
    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'One', slug: 'unique-slug-1' })
      .expect(201);

    const dup = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Two', slug: 'unique-slug-1' })
      .expect(409);

    expect(dup.body.error.code).toBe('SLUG_ALREADY_EXISTS');
  });

  it('lists only own cards with pagination and hides soft-deleted', async () => {
    const a = await register(`e-${Date.now()}@example.com`);
    const b = await register(`f-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', a.cookies)
      .send({ displayName: 'A1', slug: 'owner-a-card-1' })
      .expect(201);
    const a2 = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', a.cookies)
      .send({ displayName: 'A2', slug: 'owner-a-card-2' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', b.cookies)
      .send({ displayName: 'B1', slug: 'owner-b-card-1' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/cards?page=1&limit=10')
      .set('Cookie', a.cookies)
      .expect(200);

    expect(list.body.total).toBe(2);
    expect(list.body.items).toHaveLength(2);

    await request(app.getHttpServer())
      .delete(`/api/v1/cards/${a2.body.card.id}`)
      .set('Cookie', a.cookies)
      .expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/cards')
      .set('Cookie', a.cookies)
      .expect(200);
    expect(afterDelete.body.total).toBe(1);
  });

  it('returns same 404 for missing and foreign cards on GET/PATCH/DELETE', async () => {
    const a = await register(`g-${Date.now()}@example.com`);
    const b = await register(`h-${Date.now()}@example.com`);
    const card = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', a.cookies)
      .send({ displayName: 'Private', slug: 'private-card-1' })
      .expect(201);

    const missingId = '00000000-0000-4000-8000-000000000000';

    for (const cookies of [b.cookies]) {
      await request(app.getHttpServer())
        .get(`/api/v1/cards/${card.body.card.id}`)
        .set('Cookie', cookies)
        .expect(404)
        .expect(({ body }) => expect(body.error.code).toBe('NOT_FOUND'));

      await request(app.getHttpServer())
        .patch(`/api/v1/cards/${card.body.card.id}`)
        .set('Cookie', cookies)
        .send({ displayName: 'Hacked' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/cards/${card.body.card.id}`)
        .set('Cookie', cookies)
        .expect(404);
    }

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${missingId}`)
      .set('Cookie', a.cookies)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${card.body.card.id}`)
      .expect(401);
  });

  it('allows owner edit without auto-changing slug; supports status transitions', async () => {
    const { cookies } = await register(`i-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Old Name', slug: 'stable-slug-ok' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/cards/${created.body.card.id}`)
      .set('Cookie', cookies)
      .send({ displayName: 'New Name', showEmail: true })
      .expect(200);

    expect(updated.body.card.displayName).toBe('New Name');
    expect(updated.body.card.slug).toBe('stable-slug-ok');
    expect(updated.body.card.showEmail).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201)
      .expect(({ body }) => expect(body.card.status).toBe('published'));

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/unpublish`)
      .set('Cookie', cookies)
      .expect(201)
      .expect(({ body }) => expect(body.card.status).toBe('draft'));

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/archive`)
      .set('Cookie', cookies)
      .expect(201)
      .expect(({ body }) => expect(body.card.status).toBe('archived'));
  });

  it('soft-deleted card is not editable; links remain under soft-deleted card', async () => {
    const { cookies } = await register(`j-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({
        displayName: 'Temp',
        slug: 'temp-card-slug',
        links: [{ url: 'https://example.com/x', label: 'X' }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/cards/${created.body.card.id}`)
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/cards/${created.body.card.id}`)
      .set('Cookie', cookies)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/cards/${created.body.card.id}`)
      .set('Cookie', cookies)
      .send({ displayName: 'Nope' })
      .expect(404);

    const links = await prisma.cardLink.count({
      where: { cardId: created.body.card.id },
    });
    expect(links).toBe(1);
  });
});

