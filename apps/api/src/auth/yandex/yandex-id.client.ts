import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';

export type YandexTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export type YandexUserInfo = {
  id: string;
  login?: string;
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
  default_email?: string;
  emails?: string[];
};

@Injectable()
export class YandexIdClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('YANDEX_ID_CLIENT_ID')?.trim() &&
        this.config.get<string>('YANDEX_ID_CLIENT_SECRET')?.trim(),
    );
  }

  authorizeUrl(params: { state: string; redirectUri: string }): string {
    const clientId = this.requireClientId();
    const url = new URL('https://oauth.yandex.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    // login:email + login:info cover id, email and display name.
    url.searchParams.set('scope', 'login:info login:email');
    return url.toString();
  }

  async exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<YandexTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: this.requireClientId(),
      client_secret: this.requireClientSecret(),
      redirect_uri: params.redirectUri,
    });

    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        `Yandex ID token exchange failed (${response.status})`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const json = (await response.json()) as YandexTokenResponse & {
      error?: string;
    };
    if (!json.access_token) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID token exchange failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return json;
  }

  async fetchUserInfo(accessToken: string): Promise<YandexUserInfo> {
    const response = await fetch(
      'https://login.yandex.ru/info?format=json',
      {
        method: 'GET',
        headers: { Authorization: `OAuth ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID user info failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const json = (await response.json()) as YandexUserInfo;
    if (!json.id) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID did not return a user id',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return json;
  }

  private requireClientId(): string {
    const clientId = this.config.get<string>('YANDEX_ID_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID is not configured',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return clientId;
  }

  private requireClientSecret(): string {
    const secret = this.config.get<string>('YANDEX_ID_CLIENT_SECRET')?.trim();
    if (!secret) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'Yandex ID is not configured',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return secret;
  }
}
