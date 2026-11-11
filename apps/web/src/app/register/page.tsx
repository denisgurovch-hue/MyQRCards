'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
          displayName: String(form.get('displayName') ?? '') || undefined,
        }),
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось зарегистрироваться',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-aside">
          <p className="brand brand-mark">
            Sign<span>et</span>
          </p>
          <p>Создайте аккаунт и опубликуйте первую цифровую визитку за пару минут.</p>
        </aside>
        <section className="panel">
          <div className="panel-head">
            <p className="eyebrow">Старт</p>
            <h1 className="section-title">Регистрация</h1>
            <p className="muted">Имя, e-mail и пароль — этого достаточно</p>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <form onSubmit={onSubmit} className="stack">
            <label>
              Имя
              <input name="displayName" type="text" autoComplete="name" />
            </label>
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Пароль
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <button className="accent" type="submit" disabled={pending}>
              {pending ? 'Создаём…' : 'Зарегистрироваться'}
            </button>
          </form>
          <div className="stack" style={{ marginTop: '1rem' }}>
            <a className="button secondary" href="/api/v1/auth/vkid/authorize">
              Войти через VK ID
            </a>
            <p className="muted">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
