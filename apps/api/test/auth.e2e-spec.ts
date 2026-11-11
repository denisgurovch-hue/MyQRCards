import { INestApplication, ValidationPipe, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppError } from '../src/common/errors/app-error';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { VkidClient } from '../src/auth/vkid/vkid.client';
import { AuthService } from '../src/auth/auth.service';
import { RedisService } from '../src/redis/redis.service';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../src/auth/session/session.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let redis: RedisService;

  const vkid = {
    isConfigured: jest.fn(() => true),
    authorizeUrl: jest.fn(),
    exchangeCode: jest.fn(),
    fetchUserInfo: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VkidClient)
      .useValue(vkid)
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
    authService = app.get(AuthService);
    redis = app.get(RedisService);

    await prisma.refreshToken.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.refreshToken.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.user.deleteMany();
    await redis.deleteByPrefix('rl:');
    await redis.deleteByPrefix('oauth:vkid:');
  });


  function uniqueEmail(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  }

  it('registers a user and sets httpOnly cookies', async () => {
    const email = uniqueEmail('reg');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'StrongPassphrase123!',
        displayName: 'Иван',
      })
      .expect(201);

    expect(response.body.user.email).toBe(email);
    expect(response.body).not.toHaveProperty('refreshToken');
    const setCookie = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(`^${ACCESS_COOKIE}=`)),
        expect.stringMatching(new RegExp(`^${REFRESH_COOKIE}=`)),
      ]),
    );
    expect(setCookie.join(';')).toMatch(/HttpOnly/i);
    expect(setCookie.join(';')).toMatch(/SameSite=Lax/i);
  });


  it('rejects duplicate registration', async () => {
    const email = uniqueEmail('dup');
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('logs in with valid credentials and rejects invalid password', async () => {
    const email = uniqueEmail('login');
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(200);

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassphrase123!' })
      .expect(401);

    expect(invalid.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(invalid.body.error.message).not.toMatch(/hash|sql|prisma/i);
  });

  it('protects /auth/me and supports logout revoke', async () => {
    const email = uniqueEmail('me');
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(201);

    const cookies = register.headers['set-cookie'];

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.email).toBe(email);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(204);

    const active = await prisma.refreshToken.count({
      where: { revokedAt: null },
    });
    expect(active).toBe(0);
  });

  it('revokes all refresh tokens on password change', async () => {
    const email = uniqueEmail('pwd');
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPassphrase123!' })
      .expect(201);

    const userId = register.body.user.id as string;
    await authService.changePassword(userId, 'AnotherStrongPass123!');

    const active = await prisma.refreshToken.count({
      where: { userId, revokedAt: null },
    });
    expect(active).toBe(0);
  });

  it('creates user on first VK ID login and reuses on next login', async () => {
    vkid.authorizeUrl.mockImplementation(
      (params: { state: string; codeChallenge: string; redirectUri: string }) => {
        const url = new URL('https://id.vk.ru/authorize');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', params.state);
        url.searchParams.set('code_challenge', params.codeChallenge);
        url.searchParams.set('redirect_uri', params.redirectUri);
        url.searchParams.set('code_challenge_method', 'S256');
        return url.toString();
      },
    );
    vkid.exchangeCode.mockResolvedValue({
      access_token: 'vk-access',
      user_id: 'vk-user-1',
    });
    vkid.fetchUserInfo.mockResolvedValue({
      user: {
        user_id: 'vk-user-1',
        first_name: 'VK',
        last_name: 'User',
        email: uniqueEmail('vk'),
      },
    });

    const authorize = await request(app.getHttpServer())
      .get('/api/v1/auth/vkid/authorize')
      .expect(302);

    const location = new URL(authorize.headers.location as string);
    expect(location.origin + location.pathname).toBe('https://id.vk.ru/authorize');
    const state = location.searchParams.get('state');
    expect(state).toBeTruthy();

    const first = await request(app.getHttpServer())
      .get('/api/v1/auth/vkid/callback')
      .query({
        payload: JSON.stringify({
          code: 'auth-code',
          state,
          type: 'code_v2',
          device_id: 'device-1',
        }),
      })
      .expect(302);

    expect(first.headers.location).toContain('/dashboard');
    expect(first.headers['set-cookie']).toBeDefined();
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.identity.count()).toBe(1);

    vkid.exchangeCode.mockResolvedValue({
      access_token: 'vk-access-2',
      user_id: 'vk-user-1',
    });
    vkid.fetchUserInfo.mockResolvedValue({
      user: {
        user_id: 'vk-user-1',
        first_name: 'VK',
        last_name: 'User',
      },
    });

    const authorize2 = await request(app.getHttpServer())
      .get('/api/v1/auth/vkid/authorize')
      .expect(302);
    const state2 = new URL(
      authorize2.headers.location as string,
    ).searchParams.get('state');

    await request(app.getHttpServer())
      .get('/api/v1/auth/vkid/callback')
      .query({
        code: 'auth-code-2',
        state: state2,
        device_id: 'device-1',
      })
      .expect(302);

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.identity.count()).toBe(1);
    expect(await redis.isReady()).toBe(true);
  });

  it('rate limits repeated registration attempts', async () => {
    const agent = request(app.getHttpServer());

    for (let i = 0; i < 10; i += 1) {
      await agent
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail(`rl-${i}`),
          password: 'StrongPassphrase123!',
        })
        .expect(201);
    }

    const limited = await agent
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('rl-overflow'),
        password: 'StrongPassphrase123!',
      })
      .expect(429);

    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});

