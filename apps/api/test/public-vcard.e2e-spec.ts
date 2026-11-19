import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import vCard from 'vcf';
import { AppModule } from '../src/app.module';
import { AppError } from '../src/common/errors/app-error';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { VkidClient } from '../src/auth/vkid/vkid.client';
import {
  normalizePublicAppUrl,
  publicCardCanonicalUrl,
} from '../src/cards/public-app-url';
import { photoFilePath } from '../src/cards/card-photo.storage';

describe('Public vCard API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let storageDir: string;
  const expectedBase = normalizePublicAppUrl(
    process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  );

  beforeAll(async () => {
    storageDir = mkdtempSync(join(tmpdir(), 'vcard-photos-'));
    process.env.CARD_PHOTO_STORAGE_DIR = storageDir;
    process.env.WEB_ORIGIN = expectedBase;
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
        password: 'StrongPassphrase123!', lastName: 'Owner', firstName: 'Account',
      })
      .expect(201);
    return {
      cookies: res.headers['set-cookie'] as unknown as string[],
    };
  }

  function readVcardBody(res: request.Response): string {
    if (Buffer.isBuffer(res.body)) {
      return res.body.toString('utf8');
    }
    if (typeof res.body === 'string') {
      return res.body;
    }
    if (typeof res.text === 'string' && res.text.length > 0) {
      return res.text;
    }
    return Buffer.from(res.body as ArrayBuffer).toString('utf8');
  }

  function getVcard(slug: string, query = '') {
    return request(app.getHttpServer())
      .get(`/api/v1/public/cards/${slug}/vcard${query}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
  }

  async function createPublishedCard(
    cookies: string[],
    overrides: Record<string, unknown> = {},
  ) {
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({
        displayName: 'Иван Тест',
        slug: 'vcard-person-1',
        phone: '+79990001122',
        email: 'on-card@example.com',
        showEmail: true,
        jobTitle: 'Инженер',
        companyName: 'Demo Co',
        websiteUrl: 'https://example.com',
        summary: 'Кириллица и UTF-8',
        ...overrides,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    return created.body.card as { id: string; slug: string };
  }

  it('returns vCard without auth with headers and parseable body', async () => {
    const accountEmail = `owner-${Date.now()}@example.com`;
    const { cookies } = await register(accountEmail);
    const card = await createPublishedCard(cookies);

    const res = await getVcard(card.slug).expect(200);

    expect(String(res.headers['cache-control'])).toMatch(/no-store/i);
    expect(String(res.headers['content-type'])).toMatch(
      /text\/vcard;\s*charset=utf-8/i,
    );
    expect(String(res.headers['content-disposition'])).toBe(
      `inline; filename="contact-${card.slug}.vcf"`,
    );
    expect(String(res.headers['x-content-type-options'])).toMatch(/nosniff/i);
    expect(res.headers['set-cookie']).toBeUndefined();

    const text = readVcardBody(res);
    const [parsed] = vCard.parse(text);
    expect(parsed.get('fn').valueOf()).toBe('Иван Тест');
    expect(parsed.get('n').valueOf()).toBe('Иван Тест;;;;');
    expect(parsed.get('tel').valueOf()).toBe('+79990001122');
    expect(parsed.get('email').valueOf()).toBe('on-card@example.com');
    expect(parsed.get('org').valueOf()).toBe('Demo Co');
    expect(parsed.get('title').valueOf()).toBe('Инженер');
    expect(text).toContain(publicCardCanonicalUrl(expectedBase, card.slug));
    expect(text).not.toContain(accountEmail);
  });

  it('supports download=1 attachment with identical body to inline', async () => {
    const { cookies } = await register(`dl-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, { slug: 'vcard-dl-1' });

    const inlineRes = await getVcard(card.slug).expect(200);
    const attachmentRes = await getVcard(card.slug, '?download=1').expect(200);

    expect(String(inlineRes.headers['content-disposition'])).toBe(
      `inline; filename="contact-${card.slug}.vcf"`,
    );
    expect(String(attachmentRes.headers['content-disposition'])).toBe(
      `attachment; filename="contact-${card.slug}.vcf"`,
    );
    expect(String(attachmentRes.headers['content-type'])).toMatch(
      /text\/vcard;\s*charset=utf-8/i,
    );
    expect(String(attachmentRes.headers['cache-control'])).toMatch(/no-store/i);
    expect(readVcardBody(attachmentRes)).toBe(readVcardBody(inlineRes));
  });

  it('rejects invalid download query values with JSON 400', async () => {
    const { cookies } = await register(`bad-dl-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, { slug: 'vcard-bad-dl' });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/cards/${card.slug}/vcard?download=true`)
      .expect(400);

    expect(res.headers['content-disposition']).toBeUndefined();
    expect(String(res.headers['content-type'] ?? '')).toMatch(/json/i);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('omits EMAIL when showEmail=false and never uses account email', async () => {
    const accountEmail = `acct-${Date.now()}@example.com`;
    const { cookies } = await register(accountEmail);
    const card = await createPublishedCard(cookies, {
      slug: 'vcard-hidden-mail',
      email: 'on-card@example.com',
      showEmail: false,
    });

    const res = await getVcard(card.slug).expect(200);
    const text = readVcardBody(res);
    expect(text).not.toMatch(/EMAIL/i);
    expect(text).not.toContain('on-card@example.com');
    expect(text).not.toContain(accountEmail);

    await request(app.getHttpServer())
      .patch(`/api/v1/cards/${card.id}`)
      .set('Cookie', cookies)
      .send({ showEmail: true })
      .expect(200);

    const shown = await getVcard(card.slug).expect(200);
    const shownText = readVcardBody(shown);
    expect(shownText).toContain('on-card@example.com');
  });

  it('returns 404 for draft/unpublish/archived/deleted/unknown', async () => {
    const { cookies } = await register(`st-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/cards')
      .set('Cookie', cookies)
      .send({ displayName: 'Hidden', slug: 'vcard-hidden-1' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/public/cards/vcard-hidden-1/vcard')
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe('CARD_NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/publish`)
      .set('Cookie', cookies)
      .expect(201);

    await getVcard('vcard-hidden-1').expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${created.body.card.id}/unpublish`)
      .set('Cookie', cookies)
      .expect(201);

    await getVcard('vcard-hidden-1').expect(404);

    await getVcard('no-such-vcard').expect(404);

    await getVcard('BAD').expect(404);
  });

  it('returns updated values after edit', async () => {
    const { cookies } = await register(`edit-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, { slug: 'vcard-edit-1' });

    await request(app.getHttpServer())
      .patch(`/api/v1/cards/${card.id}`)
      .set('Cookie', cookies)
      .send({ phone: '+71112223344', displayName: 'Новое Имя' })
      .expect(200);

    const res = await getVcard(card.slug).expect(200);
    const [parsed] = vCard.parse(readVcardBody(res));
    expect(parsed.get('fn').valueOf()).toBe('Новое Имя');
    expect(parsed.get('tel').valueOf()).toBe('+71112223344');
  });

  it('embeds inline JPEG PHOTO when published card has a photo', async () => {
    const { cookies } = await register(`photo-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, { slug: 'vcard-photo-1' });

    const jpeg = await sharp({
      create: {
        width: 160,
        height: 160,
        channels: 3,
        background: '#4a90e2',
      },
    })
      .jpeg()
      .toBuffer();

    await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', cookies)
      .attach('photo', jpeg, {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const withoutPhoto = await createPublishedCard(cookies, {
      slug: 'vcard-no-photo-1',
      displayName: 'No Avatar',
    });

    const withPhotoRes = await getVcard(card.slug).expect(200);
    const withPhotoText = readVcardBody(withPhotoRes);
    expect(withPhotoText).toMatch(/PHOTO;ENCODING=b;TYPE=JPEG:/);
    expect(withPhotoText).not.toMatch(/PHOTO;VALUE=URI/i);
    expect(String(withPhotoRes.headers['content-disposition'])).toBe(
      `inline; filename="contact-${card.slug}.vcf"`,
    );

    const [parsed] = vCard.parse(withPhotoText);
    expect(parsed.get('photo')).toBeDefined();
    expect(parsed.get('fn').valueOf()).toBe('Иван Тест');

    const unfolded = withPhotoText.replace(/\r\n /g, '');
    const match = unfolded.match(/PHOTO;ENCODING=b;TYPE=JPEG:([A-Za-z0-9+/=]+)/);
    expect(match).toBeTruthy();
    const photoBytes = Buffer.from(match![1], 'base64');
    expect(photoBytes[0]).toBe(0xff);
    expect(photoBytes[1]).toBe(0xd8);
    const meta = await sharp(photoBytes).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBeLessThanOrEqual(512);
    expect(meta.height).toBeLessThanOrEqual(512);

    const noPhotoText = readVcardBody(
      await getVcard(withoutPhoto.slug).expect(200),
    );
    expect(noPhotoText).not.toMatch(/\r\nPHOTO[;:]/i);
  });

  it('still returns vCard without PHOTO when photo file is missing', async () => {
    const { cookies } = await register(`missing-${Date.now()}@example.com`);
    const card = await createPublishedCard(cookies, {
      slug: 'vcard-missing-photo',
    });

    const jpeg = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: '#112233',
      },
    })
      .jpeg()
      .toBuffer();

    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/cards/${card.id}/photo`)
      .set('Cookie', cookies)
      .attach('photo', jpeg, {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const key = String(uploaded.body.photo.url).split('/').pop()!;
    unlinkSync(photoFilePath(key));

    const res = await getVcard(card.slug).expect(200);
    const text = readVcardBody(res);
    expect(text).not.toMatch(/\r\nPHOTO[;:]/i);
    expect(text).toContain('FN:Иван Тест');
    expect(String(res.headers['content-type'])).toMatch(
      /text\/vcard;\s*charset=utf-8/i,
    );
  });
});

