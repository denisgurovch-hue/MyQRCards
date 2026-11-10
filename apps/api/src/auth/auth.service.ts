import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AppError } from '../common/errors/app-error';
import { hashPassword, verifyPassword } from '../common/crypto/password';
import {
  generateOpaqueToken,
  generatePkceVerifier,
  pkceChallengeS256,
} from '../common/crypto/tokens';
import { SessionService } from './session/session.service';
import { VkidClient } from './vkid/vkid.client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const OAUTH_STATE_PREFIX = 'oauth:vkid:';
const VK_PROVIDER = 'vkid';

type OAuthStateRecord = {
  codeVerifier: string;
  redirectUri: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: SessionService,
    private readonly vkid: VkidClient,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName?.trim() || null,
        },
      });

      await this.sessions.issueSession(res, user);
      this.logger.log('User registered');
      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.sessions.issueSession(res, user);
    this.logger.log('User logged in');
    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async logout(refreshToken: string | undefined, res: Response): Promise<void> {
    if (refreshToken) {
      await this.sessions.revokeRefreshToken(refreshToken);
    }
    this.sessions.clearSessionCookies(res);
    this.logger.log('User logged out');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  /**
   * Updates password hash and revokes all refresh tokens for the user.
   * Exposed for AC coverage; not a public password-recovery flow.
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    this.logger.log('Password changed; refresh tokens revoked');
  }

  async startVkidAuth(): Promise<{ url: string }> {
    const redirectUri = this.config.get<string>(
      'VK_ID_REDIRECT_URI',
      'http://localhost:3000/api/v1/auth/vkid/callback',
    );
    const state = generateOpaqueToken(24);
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = pkceChallengeS256(codeVerifier);

    await this.redis.setJson(
      `${OAUTH_STATE_PREFIX}${state}`,
      { codeVerifier, redirectUri } satisfies OAuthStateRecord,
      600,
    );

    const url = this.vkid.authorizeUrl({
      state,
      codeChallenge,
      redirectUri,
    });

    return { url };
  }

  async handleVkidCallback(
    query: {
      code?: string;
      state?: string;
      device_id?: string;
      error?: string;
    },
    res: Response,
  ): Promise<string> {
    const webOrigin = this.config.get<string>(
      'WEB_ORIGIN',
      'http://localhost:3000',
    );

    if (query.error || !query.code || !query.state || !query.device_id) {
      throw new AppError(
        'OAUTH_INVALID_CODE',
        'OAuth callback is missing required parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const record = await this.redis.getJson<OAuthStateRecord>(
      `${OAUTH_STATE_PREFIX}${query.state}`,
    );
    if (!record) {
      throw new AppError(
        'OAUTH_INVALID_STATE',
        'OAuth state is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.redis.del(`${OAUTH_STATE_PREFIX}${query.state}`);

    const tokens = await this.vkid.exchangeCode({
      code: query.code,
      codeVerifier: record.codeVerifier,
      redirectUri: record.redirectUri,
      deviceId: query.device_id,
      state: query.state,
    });

    if (!tokens.access_token) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'VK ID did not return an access token',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const info = await this.vkid.fetchUserInfo(tokens.access_token);
    const providerUserId = String(
      info.user?.user_id ?? tokens.user_id ?? '',
    );
    if (!providerUserId) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'VK ID did not return a user id',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const email = info.user?.email?.trim().toLowerCase() || null;
    const displayName = [info.user?.first_name, info.user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || null;

    const user = await this.prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.identity.findUnique({
        where: {
          provider_providerUserId: {
            provider: VK_PROVIDER,
            providerUserId,
          },
        },
        include: { user: true },
      });

      if (existingIdentity) {
        return existingIdentity.user;
      }

      if (email) {
        const existingByEmail = await tx.user.findUnique({ where: { email } });
        if (existingByEmail) {
          await tx.identity.create({
            data: {
              userId: existingByEmail.id,
              provider: VK_PROVIDER,
              providerUserId,
            },
          });
          return existingByEmail;
        }
      }

      return tx.user.create({
        data: {
          email,
          displayName,
          identities: {
            create: {
              provider: VK_PROVIDER,
              providerUserId,
            },
          },
        },
      });
    });

    await this.sessions.issueSession(res, user);
    this.logger.log('User authenticated via VK ID');
    return `${webOrigin}/dashboard`;
  }
}
