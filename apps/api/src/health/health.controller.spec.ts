import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let app: INestApplication;
  const healthService = {
    liveness: jest.fn().mockReturnValue({ status: 'ok', gitSha: 'test-sha' }),
    readiness: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'readyz', method: RequestMethod.GET }],
    });
    await app.init();
  });


  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/healthz returns 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/healthz')
      .expect(200)
      .expect({ status: 'ok', gitSha: 'test-sha' });
  });

  it('GET /readyz returns 200 when dependencies are up', async () => {
    healthService.readiness.mockResolvedValue({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });

    await request(app.getHttpServer())
      .get('/readyz')
      .expect(200)
      .expect({
        status: 'ok',
        checks: { database: 'up', redis: 'up' },
      });
  });

  it('GET /readyz returns 503 when dependencies are degraded', async () => {
    healthService.readiness.mockResolvedValue({
      status: 'degraded',
      checks: { database: 'down', redis: 'up' },
    });

    await request(app.getHttpServer())
      .get('/readyz')
      .expect(503)
      .expect({
        status: 'degraded',
        checks: { database: 'down', redis: 'up' },
      });
  });
});
