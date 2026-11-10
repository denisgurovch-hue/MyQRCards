import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors/app-error';
import { HttpStatus } from '@nestjs/common';

export type VkTokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  user_id?: number | string;
  state?: string;
};

export type VkUserInfo = {
  user: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
  };
};

@Injectable()
export class VkidClient {
  constructor(private readonly config: ConfigService) {}

  authorizeUrl(params: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string {
    const clientId = this.requireClientId();
    const url = new URL('https://id.vk.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('scope', 'email');
    return url.toString();
  }

  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    deviceId: string;
    state: string;
  }): Promise<VkTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: this.requireClientId(),
      device_id: params.deviceId,
      state: params.state,
    });

    const serviceToken = this.config.get<string>('VK_ID_CLIENT_SECRET');
    if (serviceToken) {
      body.set('client_secret', serviceToken);
      body.set('service_token', serviceToken);
    }

    const response = await fetch('https://id.vk.ru/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'VK ID token exchange failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return (await response.json()) as VkTokenResponse;
  }

  async fetchUserInfo(accessToken: string): Promise<VkUserInfo> {
    const body = new URLSearchParams({
      access_token: accessToken,
      client_id: this.requireClientId(),
    });

    const response = await fetch('https://id.vk.ru/oauth2/user_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'VK ID user info failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return (await response.json()) as VkUserInfo;
  }

  private requireClientId(): string {
    const clientId = this.config.get<string>('VK_ID_CLIENT_ID');
    if (!clientId) {
      throw new AppError(
        'OAUTH_PROVIDER_ERROR',
        'VK ID is not configured',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return clientId;
  }
}
