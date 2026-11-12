'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import { CardCoverEditor } from './card-cover-editor';
import { CardPhotoEditor } from './card-photo-editor';

type Card = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  showEmail: boolean;
  websiteUrl: string | null;
  photoUrl: string | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  slug: string;
  status: string;
  links: Array<{ label: string | null; url: string }>;
};

export default function EditCardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ card: Card }>(`/api/v1/cards/${params.id}`);
        if (!cancelled) setCard(data.card);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const linkUrl = String(form.get('linkUrl') ?? '').trim();
    const linkLabel = String(form.get('linkLabel') ?? '').trim();

    try {
      const body: Record<string, unknown> = {
        displayName: String(form.get('displayName') ?? ''),
        jobTitle: String(form.get('jobTitle') ?? '') || null,
        companyName: String(form.get('companyName') ?? '') || null,
        summary: String(form.get('summary') ?? '') || null,
        phone: String(form.get('phone') ?? '') || null,
        email: String(form.get('email') ?? '') || null,
        showEmail: form.get('showEmail') === 'on',
        websiteUrl: String(form.get('websiteUrl') ?? '') || null,
        slug: String(form.get('slug') ?? ''),
      };
      body.links = linkUrl
        ? [{ url: linkUrl, label: linkLabel || undefined, position: 0 }]
        : [];

      const updated = await apiFetch<{ card: Card }>(`/api/v1/cards/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setCard(updated.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setPending(false);
    }
  }

  async function runStatus(path: string) {
    if (!card) return;
    setPending(true);
    setError(null);
    try {
      const updated = await apiFetch<{ card: Card }>(
        `/api/v1/cards/${card.id}/${path}`,
        {
          method: 'POST',
        },
      );
      setCard(updated.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка статуса');
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!card) return;
    setPending(true);
    try {
      await apiFetch(`/api/v1/cards/${card.id}`, { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
      setPending(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-shell">
        <section className="panel">
          <p className="muted">Загрузка…</p>
        </section>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="auth-shell">
        <section className="panel">
          <p className="error">{error ?? 'Визитка не найдена'}</p>
          <Link href="/dashboard">В кабинет</Link>
        </section>
      </main>
    );
  }

  const firstLink = card.links[0];

  return (
    <main className="auth-shell">
      <section className="panel panel-wide">
        <div className="panel-head">
          <p className="brand brand-mark">
            Sign<span>et</span>
          </p>
          <h1 className="section-title">Редактирование</h1>
          <p className="muted">
            Статус:{' '}
            <span
              className={
                card.status === 'published'
                  ? 'status-pill is-published'
                  : 'status-pill'
              }
            >
              {card.status}
            </span>
          </p>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <CardPhotoEditor
          cardId={card.id}
          photoUrl={card.photoUrl}
          displayName={card.displayName}
          onPhotoChange={(next) =>
            setCard((current) =>
              current ? { ...current, photoUrl: next } : current,
            )
          }
        />
        <CardCoverEditor
          cardId={card.id}
          coverColor={card.coverColor}
          coverImageUrl={card.coverImageUrl}
          onCoverChange={(next) =>
            setCard((current) =>
              current
                ? {
                    ...current,
                    coverColor:
                      next.coverColor !== undefined
                        ? next.coverColor
                        : current.coverColor,
                    coverImageUrl:
                      next.coverImageUrl !== undefined
                        ? next.coverImageUrl
                        : current.coverImageUrl,
                  }
                : current,
            )
          }
        />
        <form onSubmit={onSubmit} className="stack" style={{ marginTop: '1.25rem' }}>
          <label>
            Имя *
            <input
              name="displayName"
              required
              maxLength={120}
              defaultValue={card.displayName}
            />
          </label>
          <label>
            Должность
            <input name="jobTitle" defaultValue={card.jobTitle ?? ''} />
          </label>
          <label>
            Компания
            <input name="companyName" defaultValue={card.companyName ?? ''} />
          </label>
          <label>
            Описание
            <input name="summary" defaultValue={card.summary ?? ''} />
          </label>
          <label>
            Телефон
            <input name="phone" defaultValue={card.phone ?? ''} />
          </label>
          <label>
            E-mail
            <input name="email" type="email" defaultValue={card.email ?? ''} />
          </label>
          <label className="check-row">
            <input
              name="showEmail"
              type="checkbox"
              defaultChecked={card.showEmail}
            />
            Показывать e-mail публично
          </label>
          <label>
            Сайт
            <input
              name="websiteUrl"
              type="url"
              defaultValue={card.websiteUrl ?? ''}
            />
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={6}
              maxLength={32}
              defaultValue={card.slug}
            />
          </label>
          <label>
            Ссылка (label)
            <input name="linkLabel" defaultValue={firstLink?.label ?? ''} />
          </label>
          <label>
            Ссылка (URL)
            <input
              name="linkUrl"
              type="url"
              defaultValue={firstLink?.url ?? ''}
            />
          </label>
          <button className="accent" type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </form>

        <div className="stack" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => runStatus('publish')}
          >
            Опубликовать
          </button>
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => runStatus('unpublish')}
          >
            Снять с публикации
          </button>
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => runStatus('archive')}
          >
            В архив
          </button>
          <button type="button" disabled={pending} onClick={onDelete}>
            Удалить
          </button>
        </div>

        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/dashboard">Назад в кабинет</Link>
        </p>
      </section>
    </main>
  );
}
