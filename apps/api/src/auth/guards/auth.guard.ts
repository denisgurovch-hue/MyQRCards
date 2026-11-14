import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../session/session.service';

export type AuthenticatedRequest = Request & {
  user?: { id: string; email: string | null };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.sessions.getAccessTokenFromRequest(req);
    if (!token) {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: { sub: string; email: string | null };
    try {
      payload = this.sessions.verifyAccessToken(token);
    } catch {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    req.user = { id: user.id, email: user.email };
    return true;
  }
}
