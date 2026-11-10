import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthService', () => {
  const prisma = {
    isReady: jest.fn(),
  } as unknown as PrismaService;

  const redis = {
    isReady: jest.fn(),
  } as unknown as RedisService;

  let service: HealthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new HealthService(prisma, redis);
  });

  it('returns ok for liveness', () => {
    expect(service.liveness()).toEqual({ status: 'ok' });
  });

  it('returns ok when database and redis are up', async () => {
    (prisma.isReady as jest.Mock).mockResolvedValue(true);
    (redis.isReady as jest.Mock).mockResolvedValue(true);

    await expect(service.readiness()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('returns degraded when a dependency is down', async () => {
    (prisma.isReady as jest.Mock).mockRejectedValue(new Error('db down'));
    (redis.isReady as jest.Mock).mockResolvedValue(true);

    await expect(service.readiness()).resolves.toEqual({
      status: 'degraded',
      checks: { database: 'down', redis: 'up' },
    });
  });
});
