import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppError } from '../errors/app-error';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
    onStorageError: 'open' | 'closed' = 'closed',
  ): Promise<void> {
    let count: number;
    try {
      count = await this.redis.incrementWithTtl(`rl:${key}`, windowSeconds);
    } catch (error) {
      if (onStorageError === 'open') {
        this.logger.warn(
          `rl_storage_unavailable key=${key.split(':')[0] ?? 'unknown'}; allowing request`,
        );
        return;
      }
      throw error;
    }

    if (count > limit) {
      throw new AppError(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds: windowSeconds },
      );
    }
  }
}
