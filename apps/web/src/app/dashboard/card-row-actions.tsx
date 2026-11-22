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

type Panel = 'menu' | 'publish-confirm' | 'delete-confirm' | null;

/**
 * Primary nav (edit / present / public) plus overflow lifecycle
 * (publish · unpublish · delete) with confirm sheets.
 */
export function CardRowActions({
  cardId,
  slug,
  status,
  displayName,
}: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = status === 'published';

  function openMenu() {
    setError(null);
    setPanel('menu');
  }

  function closePanels() {
    if (busy) return;
    setPanel(null);
    setError(null);
  }

  async function runStatus(path: 'publish' | 'unpublish') {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/cards/${encodeURIComponent(cardId)}/${path}`, {
        method: 'POST',
      });
      setPanel(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка статуса');
      setPanel('menu');
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
      setPanel(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
      setPanel('menu');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
        <button
          type="button"
          className="button secondary"
          aria-haspopup="dialog"
          aria-expanded={panel === 'menu'}
          onClick={openMenu}
        >
          Ещё
        </button>
      </div>
      {!published ? (
        <p className="muted card-action-note">
          Опубликуйте визитку через «Ещё», чтобы получить публичную ссылку и
          QR-код.
        </p>
      ) : null}

      {panel === 'menu' ? (
        <NestedSheet open title="Управление" onClose={closePanels}>
          {error ? (
            <p className="muted" role="alert">
              {error}
            </p>
          ) : null}
          <div className="edit-v2-sheet-actions">
            {published ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void runStatus('unpublish')}
              >
                Снять с публикации
              </button>
            ) : (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setPanel('publish-confirm');
                }}
              >
                Опубликовать
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setError(null);
                setPanel('delete-confirm');
              }}
            >
              Удалить
            </button>
          </div>
        </NestedSheet>
      ) : null}

      {panel === 'publish-confirm' ? (
        <NestedSheet
          open
          title="Опубликовать визитку?"
          onClose={() => {
            if (!busy) setPanel('menu');
          }}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setPanel('menu')}
              >
                Отмена
              </button>
              <button
                type="button"
                className="button accent"
                disabled={busy}
                onClick={() => void runStatus('publish')}
              >
                Опубликовать
              </button>
            </>
          }
        >
          <p>
            После публикации указанные публичные данные будут доступны любому,
            кто получит ссылку или QR-код. Ссылку можно переслать. Не размещайте
            конфиденциальную информацию.
          </p>
        </NestedSheet>
      ) : null}

      {panel === 'delete-confirm' ? (
        <NestedSheet
          open
          title="Удалить визитку?"
          onClose={() => {
            if (!busy) setPanel('menu');
          }}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setPanel('menu')}
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
    </>
  );
}
