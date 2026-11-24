import { SessionService } from './session.service';

describe('SessionService.getAccessTokenFromRequest', () => {
  const sessions = Object.create(SessionService.prototype) as SessionService;

  it('reads Bearer token from Authorization header', () => {
    const req = {
      headers: { authorization: 'Bearer abc.def.ghi' },
      cookies: {},
    } as never;
    expect(sessions.getAccessTokenFromRequest(req)).toBe('abc.def.ghi');
  });

  it('falls back to access cookie when Bearer is absent', () => {
    const req = {
      headers: {},
      cookies: { mq_access: 'cookie-token' },
    } as never;
    expect(sessions.getAccessTokenFromRequest(req)).toBe('cookie-token');
  });

  it('prefers Bearer over cookie', () => {
    const req = {
      headers: { authorization: 'Bearer header-token' },
      cookies: { mq_access: 'cookie-token' },
    } as never;
    expect(sessions.getAccessTokenFromRequest(req)).toBe('header-token');
  });
});
