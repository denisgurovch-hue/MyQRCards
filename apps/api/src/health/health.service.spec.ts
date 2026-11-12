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

  it('returns ok for liveness with gitSha', () => {
    const previous = process.env.GIT_SHA;
    process.env.GIT_SHA = 'abc123';
    try {
      expect(service.liveness()).toEqual({ status: 'ok', gitSha: 'abc123' });
    } finally {
      if (previous === undefined) {
        delete process.env.GIT_SHA;
      } else {
        process.env.GIT_SHA = previous;
      }
    }
  });

  it('defaults gitSha to unknown when unset', () => {
    const previous = process.env.GIT_SHA;
    delete process.env.GIT_SHA;
    try {
      expect(service.liveness()).toEqual({ status: 'ok', gitSha: 'unknown' });
    } finally {
      if (previous !== undefined) {
        process.env.GIT_SHA = previous;
      }
    }
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
