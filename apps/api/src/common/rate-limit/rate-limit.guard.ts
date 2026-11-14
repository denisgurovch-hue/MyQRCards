import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';
import { AppError } from '../errors/app-error';

function resolveLimit(options: RateLimitOptions): number {
  if (!options.limitEnv) {
    return options.limit;
  }
  const raw = process.env[options.limitEnv];
  if (!raw) {
    return options.limit;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : options.limit;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const limit = resolveLimit(options);

    try {
      await this.rateLimit.consume(
        `${options.key}:${ip}`,
        limit,
        options.windowSeconds,
        options.onStorageError ?? 'closed',
      );
    } catch (error) {
      if (error instanceof AppError && error.getStatus() === 429) {
        response.setHeader('Retry-After', String(options.windowSeconds));
      }
      throw error;
    }

    return true;
  }
}
