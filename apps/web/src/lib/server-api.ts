import { cookies } from 'next/headers';

export async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join('; ');

  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${apiUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}
