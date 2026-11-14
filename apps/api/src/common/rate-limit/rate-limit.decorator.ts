import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export type RateLimitOptions = {
  key: string;
  /** Default limit when env override is absent. */
  limit: number;
  windowSeconds: number;
  /** Optional env var name resolved at request time (for tests/ops). */
  limitEnv?: string;
  /**
   * When Redis is unavailable:
   * - `closed` (default): fail the request (auth-style)
   * - `open`: allow the request and log (public card surface)
   */
  onStorageError?: 'open' | 'closed';
};

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
