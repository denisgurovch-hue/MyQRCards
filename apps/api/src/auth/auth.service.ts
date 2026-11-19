import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { promises as fs } from 'node:fs';
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
import { photoFilePath } from '../cards/card-photo.storage';
import { SessionService } from './session/session.service';
import { VkidClient } from './vkid/vkid.client';
import { normalizeVkidCallbackQuery } from './vkid/vkid-callback.query';
import { YandexIdClient } from './yandex/yandex-id.client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { isAdminEmail } from '../admin/admin-emails';
import { composeDisplayName } from '../cards/card-name.util';

const VK_OAUTH_STATE_PREFIX = 'oauth:vkid:';
const YANDEX_OAUTH_STATE_PREFIX = 'oauth:yandex:';
const VK_PROVIDER = 'vkid';
const YANDEX_PROVIDER = 'yandex';

type OAuthStateRecord = {
  codeVerifier?: string;
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
    private readonly yandex: YandexIdClient,
    private readonly config: ConfigService,
  ) {}

  private toPublicUser(user: {
    id: string;
    email: string | null;
    displayName: string | null;
    lastName?: string | null;
    firstName?: string | null;
    patronymic?: string | null;
    passwordHash?: string | null;
  }, opts?: { includeAdmin?: boolean }) {
    const base = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      lastName: user.lastName ?? null,
      firstName: user.firstName ?? null,
      patronymic: user.patronymic ?? null,
      hasPassword: Boolean(user.passwordHash),
    };
    if (opts?.includeAdmin) {
      return {
        ...base,
        isAdmin: isAdminEmail(
          user.email,
          this.config.get<string>('ADMIN_USER_EMAILS'),
        ),
      };
    }
    return base;
  }

  async register(dto: RegisterDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(dto.password);
    const lastName = dto.lastName.trim();
    const firstName = dto.firstName.trim();
    const patronymic = dto.patronymic?.trim() || null;
    const displayName =
      composeDisplayName({ lastName, firstName, patronymic }) ||
      dto.displayName?.trim() ||
      null;

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          lastName,
          firstName,
          patronymic,
          displayName,
        },
      });

      await this.sessions.issueSession(res, user);
      this.logger.log('User registered');
      return {
        user: this.toPublicUser(user),
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
      user: this.toPublicUser(user, { includeAdmin: true }),
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const displayName = dto.displayName.trim();
    if (!displayName) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Display name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { displayName },
      });
      return {
        user: this.toPublicUser(user),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppError(
          'UNAUTHORIZED',
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw error;
    }
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

  async changePasswordAuthenticated(
    userId: string,
    dto: ChangePasswordDto,
    res: Response,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new AppError(
        'PASSWORD_NOT_SET',
        'Password change is not available for this account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const valid = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Invalid current password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.changePassword(userId, dto.newPassword);
    const refreshed = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    await this.sessions.issueSession(res, refreshed);
    this.logger.log('Password changed with session reissue');
    return {
      user: {
        id: refreshed.id,
        email: refreshed.email,
        displayName: refreshed.displayName,
        hasPassword: true,
      },
    };
  }

  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
    res: Response,
  ): Promise<void> {
    if (dto.confirmation !== 'Удалить') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Confirmation must exactly match Удалить',
        HttpStatus.BAD_REQUEST,
      );
    }

    const photos = await this.prisma.cardPhoto.findMany({
      where: { card: { userId } },
      select: { storageKey: true },
    });
    const storageKeys = photos.map((photo) => photo.storageKey);

    try {
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.sessions.clearSessionCookies(res);
        return;
      }
      throw error;
    }

    for (const storageKey of storageKeys) {
      await fs.unlink(photoFilePath(storageKey)).catch(() => undefined);
    }

    this.sessions.clearSessionCookies(res);
    this.logger.log('Account deleted');
  }

  async startVkidAuth(): Promise<{ url: string }> {
    if (!this.vkid.isConfigured()) {
      throw new AppError(
        'OAUTH_NOT_CONFIGURED',
        'VK ID is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const redirectUri = this.config.get<string>(
      'VK_ID_REDIRECT_URI',
      'http://localhost:3000/api/v1/auth/vkid/callback',
    );
    // VK ID requires state length >= 32 (a-zA-Z0-9_-).
    const state = generateOpaqueToken(32);
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = pkceChallengeS256(codeVerifier);

    await this.redis.setJson(
      `${VK_OAUTH_STATE_PREFIX}${state}`,
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

  async startYandexAuth(): Promise<{ url: string }> {
    if (!this.yandex.isConfigured()) {
      throw new AppError(
        'OAUTH_NOT_CONFIGURED',
        'Yandex ID is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const redirectUri = this.config.get<string>(
      'YANDEX_ID_REDIRECT_URI',
      'http://localhost:3000/api/v1/auth/yandex/callback',
    );
    const state = generateOpaqueToken(32);

    await this.redis.setJson(
      `${YANDEX_OAUTH_STATE_PREFIX}${state}`,
      { redirectUri } satisfies OAuthStateRecord,
      600,
    );

    return {
      url: this.yandex.authorizeUrl({ state, redirectUri }),
    };
  }

  async handleVkidCallback(
    query: {
      code?: string;
      state?: string;
      device_id?: string;
      error?: string;
      payload?: string;
    },
    res: Response,
  ): Promise<string> {
    const webOrigin = this.config.get<string>(
      'WEB_ORIGIN',
      'http://localhost:3000',
    );

    const normalized = normalizeVkidCallbackQuery(query);

    if (
      normalized.error ||
      !normalized.code ||
      !normalized.state ||
      !normalized.device_id
    ) {
      throw new AppError(
        'OAUTH_INVALID_CODE',
        'OAuth callback is missing required parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const record = await this.redis.getJson<OAuthStateRecord>(
      `${VK_OAUTH_STATE_PREFIX}${normalized.state}`,
    );
    if (!record?.codeVerifier) {
      throw new AppError(
        'OAUTH_INVALID_STATE',
        'OAuth state is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.redis.del(`${VK_OAUTH_STATE_PREFIX}${normalized.state}`);

    const tokens = await this.vkid.exchangeCode({
      code: normalized.code,
      codeVerifier: record.codeVerifier,
      redirectUri: record.redirectUri,
      deviceId: normalized.device_id,
      state: normalized.state,
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
    const firstName = info.user?.first_name?.trim() || null;
    const lastName = info.user?.last_name?.trim() || null;
    const displayName =
      composeDisplayName({ lastName, firstName }) ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      null;

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
          lastName,
          firstName,
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

  async handleYandexCallback(
    query: {
      code?: string;
      state?: string;
      error?: string;
    },
    res: Response,
  ): Promise<string> {
    const webOrigin = this.config.get<string>(
      'WEB_ORIGIN',
      'http://localhost:3000',
    );

    if (query.error || !query.code || !query.state) {
      throw new AppError(
        'OAUTH_INVALID_CODE',
        'OAuth callback is missing required parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const record = await this.redis.getJson<OAuthStateRecord>(
      `${YANDEX_OAUTH_STATE_PREFIX}${query.state}`,
    );
    if (!record) {
      throw new AppError(
        'OAUTH_INVALID_STATE',
        'OAuth state is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.redis.del(`${YANDEX_OAUTH_STATE_PREFIX}${query.state}`);

    const tokens = await this.yandex.exchangeCode({
      code: query.code,
      redirectUri: record.redirectUri,
    });

    if (!tokens.access_token) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID did not return an access token',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const info = await this.yandex.fetchUserInfo(tokens.access_token);
    const providerUserId = String(info.id ?? '');
    if (!providerUserId) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID did not return a user id',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const email =
      info.default_email?.trim().toLowerCase() ||
      info.emails?.find((value) => value?.trim())?.trim().toLowerCase() ||
      null;
    const firstName = info.first_name?.trim() || null;
    const lastName = info.last_name?.trim() || null;
    const displayName =
      composeDisplayName({ lastName, firstName }) ||
      info.display_name?.trim() ||
      info.real_name?.trim() ||
      null;

    const user = await this.prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.identity.findUnique({
        where: {
          provider_providerUserId: {
            provider: YANDEX_PROVIDER,
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
              provider: YANDEX_PROVIDER,
              providerUserId,
            },
          });
          return existingByEmail;
        }
      }

      return tx.user.create({
        data: {
          email,
          lastName,
          firstName,
          displayName,
          identities: {
            create: {
              provider: YANDEX_PROVIDER,
              providerUserId,
            },
          },
        },
      });
    });

    await this.sessions.issueSession(res, user);
    this.logger.log('User authenticated via Yandex ID');
    return `${webOrigin}/dashboard`;
  }
}
