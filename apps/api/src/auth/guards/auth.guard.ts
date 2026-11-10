import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../../common/errors/app-error';
import { SessionService } from '../session/session.service';

export type AuthenticatedRequest = Request & {
  user?: { id: string; email: string | null };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

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

    try {
      const payload = this.sessions.verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
