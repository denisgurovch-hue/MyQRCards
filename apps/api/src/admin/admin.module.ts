import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminMetricsService } from './admin-metrics.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminMetricsService, AdminGuard],
})
export class AdminModule {}
