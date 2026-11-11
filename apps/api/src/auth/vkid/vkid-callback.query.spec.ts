import { normalizeVkidCallbackQuery } from './vkid-callback.query';

describe('normalizeVkidCallbackQuery', () => {
  it('reads flat query params', () => {
    expect(
      normalizeVkidCallbackQuery({
        code: 'c1',
        state: 's1',
        device_id: 'd1',
      }),
    ).toEqual({ code: 'c1', state: 's1', device_id: 'd1', error: undefined });
  });

  it('parses VK ID payload JSON', () => {
    expect(
      normalizeVkidCallbackQuery({
        payload: JSON.stringify({
          code: 'auth-code',
          state: 'state-xyz',
          type: 'code_v2',
          device_id: 'device-42',
        }),
      }),
    ).toEqual({
      code: 'auth-code',
      state: 'state-xyz',
      device_id: 'device-42',
      error: undefined,
    });
  });

  it('prefers explicit query fields over payload', () => {
    expect(
      normalizeVkidCallbackQuery({
        code: 'flat',
        payload: JSON.stringify({
          code: 'nested',
          state: 's',
          device_id: 'd',
        }),
      }),
    ).toMatchObject({ code: 'flat', state: 's', device_id: 'd' });
  });
});
