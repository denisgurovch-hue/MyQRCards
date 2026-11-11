export type VkidCallbackQuery = {
  code?: string;
  state?: string;
  device_id?: string;
  error?: string;
  payload?: string;
};

/**
 * VK ID Web (auth without SDK) returns auth data in `payload` JSON.
 * Flat query params are kept for compatibility / tests.
 */
export function normalizeVkidCallbackQuery(
  query: VkidCallbackQuery,
): Required<Pick<VkidCallbackQuery, 'code' | 'state' | 'device_id'>> & {
  error?: string;
} {
  let code = query.code;
  let state = query.state;
  let deviceId = query.device_id;
  let error = query.error;

  if (query.payload) {
    try {
      const parsed = JSON.parse(query.payload) as {
        code?: string;
        state?: string;
        device_id?: string;
        error?: string;
        type?: string;
      };
      code = code || parsed.code;
      state = state || parsed.state;
      deviceId = deviceId || parsed.device_id;
      error = error || parsed.error;
    } catch {
      // fall through — missing fields fail later with OAUTH_INVALID_CODE
    }
  }

  return {
    code: code ?? '',
    state: state ?? '',
    device_id: deviceId ?? '',
    error,
  };
}
