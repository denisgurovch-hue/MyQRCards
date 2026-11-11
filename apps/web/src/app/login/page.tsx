'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-aside">
          <p className="brand brand-mark">
            MyQR<span>Cards</span>
          </p>
          <p>Войдите, чтобы управлять визитками, QR и аналитикой просмотров.</p>
        </aside>
        <section className="panel">
          <div className="panel-head">
            <p className="eyebrow">Кабинет</p>
            <h1 className="section-title">Вход</h1>
            <p className="muted">E-mail и пароль или VK ID</p>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <form onSubmit={onSubmit} className="stack">
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Пароль
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </label>
            <button className="accent" type="submit" disabled={pending}>
              {pending ? 'Входим…' : 'Войти'}
            </button>
          </form>
          <div className="stack" style={{ marginTop: '1rem' }}>
            <a className="button secondary" href="/api/v1/auth/vkid/authorize">
              Войти через VK ID
            </a>
            <p className="muted">
              Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
