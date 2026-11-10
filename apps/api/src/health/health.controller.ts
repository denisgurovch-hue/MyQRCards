import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('healthz')
  healthz() {
    return this.health.liveness();
  }

  @Get('readyz')
  async readyz(@Res({ passthrough: true }) res: Response) {
    const result = await this.health.readiness();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
