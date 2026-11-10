import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<Redis> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client;
  }

  async isReady(): Promise<boolean> {
    const client = await this.ensureConnected();
    const response = await client.ping();
    return response === 'PONG';
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = await this.ensureConnected();
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = await this.ensureConnected();
    const raw = await client.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  async del(key: string): Promise<void> {
    const client = await this.ensureConnected();
    await client.del(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const client = await this.ensureConnected();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const client = await this.ensureConnected();
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}

