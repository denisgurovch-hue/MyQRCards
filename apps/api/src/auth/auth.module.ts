import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session/session.service';
import { VkidClient } from './vkid/vkid.client';
import { AuthGuard } from './guards/auth.guard';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    VkidClient,
    AuthGuard,
    RateLimitService,
    RateLimitGuard,
  ],
  exports: [AuthService, SessionService, AuthGuard, RateLimitService, RateLimitGuard],
})
export class AuthModule {}
