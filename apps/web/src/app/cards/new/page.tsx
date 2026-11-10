'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function NewCardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const slug = String(form.get('slug') ?? '').trim();
    const linkUrl = String(form.get('linkUrl') ?? '').trim();
    const linkLabel = String(form.get('linkLabel') ?? '').trim();

    try {
      const body: Record<string, unknown> = {
        displayName: String(form.get('displayName') ?? ''),
        jobTitle: String(form.get('jobTitle') ?? '') || undefined,
        companyName: String(form.get('companyName') ?? '') || undefined,
        summary: String(form.get('summary') ?? '') || undefined,
        phone: String(form.get('phone') ?? '') || undefined,
        email: String(form.get('email') ?? '') || undefined,
        showEmail: form.get('showEmail') === 'on',
        websiteUrl: String(form.get('websiteUrl') ?? '') || undefined,
      };
      if (slug) body.slug = slug;
      if (linkUrl) {
        body.links = [{ url: linkUrl, label: linkLabel || undefined, position: 0 }];
      }

      const result = await apiFetch<{ card: { id: string } }>('/api/v1/cards', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/cards/${result.card.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать визитку');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="panel" style={{ width: 'min(560px, 100%)' }}>
        <p className="brand">MyQRCards</p>
        <p className="lede">Новая визитка</p>
        {error ? <p className="error">{error}</p> : null}
        <form onSubmit={onSubmit} className="stack">
          <label>
            Имя *
            <input name="displayName" required maxLength={120} />
          </label>
          <label>
            Должность
            <input name="jobTitle" maxLength={120} />
          </label>
          <label>
            Компания
            <input name="companyName" maxLength={120} />
          </label>
          <label>
            Описание
            <input name="summary" maxLength={1000} />
          </label>
          <label>
            Телефон
            <input name="phone" maxLength={40} />
          </label>
          <label>
            E-mail на карточке
            <input name="email" type="email" />
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input name="showEmail" type="checkbox" />
            Показывать e-mail публично
          </label>
          <label>
            Сайт
            <input name="websiteUrl" type="url" placeholder="https://" />
          </label>
          <label>
            Slug (необязательно)
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={6} maxLength={32} />
          </label>
          <label>
            Ссылка (label)
            <input name="linkLabel" maxLength={80} />
          </label>
          <label>
            Ссылка (URL)
            <input name="linkUrl" type="url" placeholder="https://" />
          </label>
          <button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Создать'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/dashboard">Назад в кабинет</Link>
        </p>
      </section>
    </main>
  );
}
