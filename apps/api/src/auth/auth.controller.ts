import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AuthGuard, type AuthenticatedRequest } from './guards/auth.guard';
import { SessionService } from './session/session.service';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @HttpCode(201)
  @RateLimit({ key: 'auth:register', limit: 10, windowSeconds: 60 })
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(dto, res);
  }

  @Post('login')
  @HttpCode(200)
  @RateLimit({ key: 'auth:login', limit: 20, windowSeconds: 60 })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refresh = this.sessions.getRefreshTokenFromRequest(req);
    await this.auth.logout(refresh, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.auth.me(req.user!.id);
  }

  @Get('vkid/authorize')
  @RateLimit({ key: 'auth:vkid:authorize', limit: 30, windowSeconds: 60 })
  async vkidAuthorize(@Res() res: Response): Promise<void> {
    const { url } = await this.auth.startVkidAuth();
    res.redirect(302, url);
  }

  @Get('vkid/callback')
  @RateLimit({ key: 'auth:vkid:callback', limit: 30, windowSeconds: 60 })
  async vkidCallback(
    @Query()
    query: {
      code?: string;
      state?: string;
      device_id?: string;
      error?: string;
    },
    @Res() res: Response,
  ): Promise<void> {
    const redirectTo = await this.auth.handleVkidCallback(query, res);
    res.redirect(302, redirectTo);
  }
}
