import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LogoutButton } from './logout-button';

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
};

async function loadMe(): Promise<MeResponse | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join('; ');

  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as MeResponse;
}

export default async function DashboardPage() {
  const me = await loadMe();
  if (!me) {
    redirect('/login');
  }

  return (
    <main className="auth-shell">
      <section className="panel">
        <p className="brand">MyQRCards</p>
        <p className="lede">Личный кабинет</p>
        <p>
          {me.user.displayName
            ? `Здравствуйте, ${me.user.displayName}`
            : 'Вы вошли в аккаунт'}
        </p>
        {me.user.email ? <p className="muted">{me.user.email}</p> : null}
        <div style={{ marginTop: '1.25rem' }}>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
