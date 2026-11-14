import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../common/errors/app-error';
import { isAdminEmail, parseAdminEmails } from './admin-emails';
import type { AuthenticatedRequest } from '../auth/guards/auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const allowlist = parseAdminEmails(
      this.config.get<string>('ADMIN_USER_EMAILS'),
    );
    if (!isAdminEmail(req.user?.email, allowlist)) {
      throw new AppError(
        'ADMIN_FORBIDDEN',
        'Admin access required',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
