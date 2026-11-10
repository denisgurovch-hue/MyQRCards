import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<void> {
    const count = await this.redis.incrementWithTtl(`rl:${key}`, windowSeconds);
    if (count > limit) {
      throw new AppError(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
