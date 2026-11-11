import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppError } from '../src/common/errors/app-error';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { VkidClient } from '../src/auth/vkid/vkid.client';

describe('Card photos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let storageDir: string;

  beforeAll(async () => {
    storageDir = mkdtempSync(join(tmpdir(), 'card-photos-'));
    process.env.CARD_PHOTO_STORAGE_DIR = storageDir;
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
    rmSync(storageDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await prisma.cardEvent.deleteMany();
    await prisma.cardLink.deleteMany();
    await prisma.card.updateMany({ data: { photoId: null, photoUrl: null } });
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
        password: 'StrongPassphrase123!',
        displayName: 'Photo Owner',
      })
      .expect(201);
    return {
      cookies: res.headers['set-cookie'] as unknown as string[],
      userId: res.body.user.id as string,
    };
  }

  async function createCard(cookies: string[], slug: string) {
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Photo Person', slug })
      .expect(201);
    return created.body.card as { id: string; slug: string; photoUrl: string | null };
  }

  async function buffer(format: 'jpeg' | 'png' | 'webp', w = 120, h = 120) {
    const image = sharp({
      create: { width: w, height: h, channels: 3, background: '#4a90e2' },
    });
    if (format === 'jpeg') return image.jpeg().toBuffer();
    if (format === 'png') return image.png().toBuffer();
    return image.webp().toBuffer();
  }

  it('uploads jpeg/png/webp, serves media, replaces and deletes', async () => {
    const owner = await register('photo-owner@example.com');
    const card = await createCard(owner.cookies, 'photo-card-1');

    const jpeg = await buffer('jpeg');
    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .attach('photo', jpeg, { filename: 'avatar.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(uploaded.body.photo.mime_type).toBe('image/webp');
    expect(uploaded.body.photo.url).toContain('/api/v1/media/cards/');
    expect(uploaded.body.photo.width).toBeGreaterThan(0);

    const key = String(uploaded.body.photo.url).split('/').pop();
    await request(app.getHttpServer())
      .get(`/api/v1/media/cards/${key}`)
      .expect(200)
      .expect('Content-Type', /image\/webp/);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/publish`)
      .set('Cookie', owner.cookies)
      .expect(201);

    const publicCard = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    expect(publicCard.body.card.photoUrl).toBe(uploaded.body.photo.url);

    const png = await buffer('png');
    const replaced = await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .attach('photo', png, { filename: 'next.png', contentType: 'image/png' })
      .expect(201);
    expect(replaced.body.photo.url).not.toBe(uploaded.body.photo.url);

    await request(app.getHttpServer())
      .delete(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .expect(200)
      .expect({ photo: null });

    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}`)
      .expect(200);
    expect(afterDelete.body.card.photoUrl).toBeNull();
  });

  it('rejects invalid payloads and unauthorized/foreign access', async () => {
    const owner = await register('photo-owner-2@example.com');
    const other = await register('photo-other@example.com');
    const card = await createCard(owner.cookies, 'photo-card-2');

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .attach('photo', await buffer('jpeg'), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', other.cookies)
      .attach('photo', await buffer('jpeg'), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .attach('photo', Buffer.from('fake'), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .attach(
        'photo',
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>',
        ),
        { filename: 'x.svg', contentType: 'image/svg+xml' },
      )
      .expect(400);

    const wide = await buffer('png', 4001, 40);
    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', owner.cookies)
      .attach('photo', wide, { filename: 'wide.png', contentType: 'image/png' })
      .expect(400);

    const before = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(before.photoId).toBeNull();
    expect(before.photoUrl).toBeNull();
  });
});
