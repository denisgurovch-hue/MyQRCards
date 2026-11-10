export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? data.error.message
        : 'Request failed';
    throw new Error(message);
  }

  return data as T;
}
