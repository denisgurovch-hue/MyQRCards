import { ConfigService } from '@nestjs/config';
import { YandexIdClient } from './yandex-id.client';

describe('YandexIdClient', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'YANDEX_ID_CLIENT_ID') return 'client-id';
      if (key === 'YANDEX_ID_CLIENT_SECRET') return 'client-secret';
      return undefined;
    }),
  } as unknown as ConfigService;

  const client = new YandexIdClient(config);

  it('isConfigured requires both id and secret', () => {
    expect(client.isConfigured()).toBe(true);

    const empty = new YandexIdClient({
      get: jest.fn(() => ''),
    } as unknown as ConfigService);
    expect(empty.isConfigured()).toBe(false);
  });

  it('builds authorize URL with state and scopes', () => {
    const url = new URL(
      client.authorizeUrl({
        state: 'state-token-32chars-minimum-xx',
        redirectUri: 'https://smartvizitka.ru/api/v1/auth/yandex/callback',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('state')).toBe('state-token-32chars-minimum-xx');
    expect(url.searchParams.get('scope')).toContain('login:email');
  });
});
