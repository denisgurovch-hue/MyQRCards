import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AdminGuard } from './admin.guard';
import {
  AdminMetricsService,
  parseAdminMetricsPeriod,
} from './admin-metrics.service';

@Controller('admin')
@UseGuards(RateLimitGuard, AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly metrics: AdminMetricsService) {}

  @Get('metrics')
  @RateLimit({ key: 'admin:metrics', limit: 60, windowSeconds: 60 })
  getMetrics(@Query('period') periodRaw?: string) {
    const period = parseAdminMetricsPeriod(periodRaw);
    return this.metrics.getMetrics(period);
  }
}
