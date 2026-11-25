'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { publicCardPath } from '../../lib/public-url';
import { NestedSheet } from '../cards/[id]/edit-v2/nested-sheet';

type Props = {
  cardId: string;
  slug: string;
  status: string;
  displayName: string;
};

/**
 * Row 1: navigate (edit / present / public).
 * Row 2: lifecycle (publish|unpublish + delete).
 * Delete asks for confirm; publish/unpublish stay one-click.
 */
export function CardRowActions({
  cardId,
  slug,
  status,
  displayName,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const published = status === 'published';

  async function runStatus(path: 'publish' | 'unpublish') {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/cards/${encodeURIComponent(cardId)}/${path}`, {
        method: 'POST',
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка статуса');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/cards/${encodeURIComponent(cardId)}`, {
        method: 'DELETE',
      });
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-row-stack">
      <div className="card-row-actions">
        <Link
          className="button secondary"
          href={`/cards/${cardId}/edit-v2`}
        >
          Изменить
        </Link>
        <Link
          className="button secondary"
          href={`/cards/${cardId}/present`}
        >
          Показать
        </Link>
        {published ? (
          <a
            className="button secondary"
            href={publicCardPath(slug)}
            target="_blank"
            rel="noreferrer"
          >
            Открыть
          </a>
        ) : null}
        <a
          className="button secondary"
          href={`/api/v1/cards/${encodeURIComponent(cardId)}/lock-screen.png`}
          download
        >
          На экран блокировки
        </a>
      </div>
      <p className="muted card-action-note card-lock-screen-hint">
        Сохраните PNG, затем в Фото (iOS) или Галерее (Android) задайте его как
        обои экрана блокировки.
      </p>

      <div className="card-row-actions card-row-actions-lifecycle">
        {published ? (
          <button
            type="button"
            className="button secondary card-row-status"
            disabled={busy}
            onClick={() => void runStatus('unpublish')}
          >
            Снять с публикации
          </button>
        ) : (
          <button
            type="button"
            className="button secondary card-row-status"
            disabled={busy}
            onClick={() => void runStatus('publish')}
          >
            Опубликовать
          </button>
        )}
        <button
          type="button"
          className="button secondary card-row-delete"
          disabled={busy}
          onClick={() => {
            setError(null);
            setDeleteOpen(true);
          }}
        >
          Удалить
        </button>
      </div>

      {error ? (
        <p className="muted card-action-note" role="alert">
          {error}
        </p>
      ) : null}

      {deleteOpen ? (
        <NestedSheet
          open
          title="Удалить визитку?"
          onClose={() => {
            if (!busy) setDeleteOpen(false);
          }}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="button accent"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                Удалить
              </button>
            </>
          }
        >
          <p>
            Визитка «{displayName}» будет удалена безвозвратно. Публичная ссылка
            и QR-код перестанут работать.
          </p>
        </NestedSheet>
      ) : null}
    </div>
  );
}
