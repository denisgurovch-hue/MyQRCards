import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Response, Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from '../../common/crypto/tokens';

export const ACCESS_COOKIE = 'mq_access';
export const REFRESH_COOKIE = 'mq_refresh';

export type AccessPayload = {
  sub: string;
  email: string | null;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get secret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-only-secret');
  }

  private get cookieSecure(): boolean {
    if (this.config.get<string>('COOKIE_SECURE') === 'true') {
      return true;
    }
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private cookieBase() {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  createAccessToken(user: { id: string; email: string | null }): string {
    const ttl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    return jwt.sign({ email: user.email }, this.secret, {
      subject: user.id,
      expiresIn: ttl,
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): AccessPayload {
    const payload = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return {
      sub: String(payload.sub),
      email: (payload.email as string | null | undefined) ?? null,
    };
  }

  async issueSession(
    res: Response,
    user: { id: string; email: string | null },
  ): Promise<void> {
    const accessToken = this.createAccessToken(user);
    const refreshToken = generateOpaqueToken(48);
    const refreshDays = Number(
      this.config.get<string>('REFRESH_TOKEN_TTL_DAYS', '30'),
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...this.cookieBase(),
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieBase(),
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });
  }

  clearSessionCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.cookieBase());
    res.clearCookie(REFRESH_COOKIE, this.cookieBase());
  }

  getRefreshTokenFromRequest(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }

  getAccessTokenFromRequest(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[ACCESS_COOKIE];
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotateRefreshToken(
    res: Response,
    rawToken: string,
  ): Promise<{ id: string; email: string | null } | null> {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      return null;
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    await this.issueSession(res, existing.user);
    return { id: existing.user.id, email: existing.user.email };
  }
}
