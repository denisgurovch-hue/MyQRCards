import { RateLimitService } from './rate-limit.service';
import { AppError } from '../errors/app-error';

describe('RateLimitService', () => {
  const redis = {
    incrementWithTtl: jest.fn(),
  };

  const service = new RateLimitService(redis as never);

  beforeEach(() => {
    redis.incrementWithTtl.mockReset();
  });

  it('throws RATE_LIMITED when count exceeds limit', async () => {
    redis.incrementWithTtl.mockResolvedValue(11);
    await expect(service.consume('pub:card:1.1.1.1', 10, 60)).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('fail-open skips limit when Redis errors', async () => {
    redis.incrementWithTtl.mockRejectedValue(new Error('redis down'));
    await expect(
      service.consume('pub:card:1.1.1.1', 10, 60, 'open'),
    ).resolves.toBeUndefined();
  });

  it('fail-closed rethrows Redis errors', async () => {
    redis.incrementWithTtl.mockRejectedValue(new Error('redis down'));
    await expect(
      service.consume('auth:login:1.1.1.1', 10, 60, 'closed'),
    ).rejects.toThrow('redis down');
  });
});
