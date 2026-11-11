'use client';

import { useState } from 'react';

type Props = {
  slug: string;
};

function vcardEndpoint(slug: string) {
  return `/api/v1/public/cards/${encodeURIComponent(slug)}/vcard`;
}

async function fetchVcardBlob(slug: string): Promise<Blob> {
  const response = await fetch(vcardEndpoint(slug), {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') ?? '';
  const okType =
    contentType.includes('text/vcard') ||
    contentType.includes('text/x-vcard') ||
    contentType.includes('application/vcard');

  if (!response.ok || !okType) {
    throw new Error(
      response.status === 404
        ? 'Визитка недоступна. Обновите страницу.'
        : 'Не удалось получить файл контакта.',
    );
  }

  return response.blob();
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function SaveContactButton({ slug }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const blob = await fetchVcardBlob(slug);
      triggerDownload(blob, `contact-${slug}.vcf`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось получить файл контакта.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="public-vcard">
      <button
        type="button"
        className="public-action public-action-secondary"
        onClick={() => void onSave()}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Готовим файл…' : 'Сохранить контакт'}
      </button>
      <p className="muted public-vcard-hint">
        Откроется файл контакта. Подтвердите добавление на устройстве.
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}{' '}
          <button
            type="button"
            className="linkish"
            onClick={() => void onSave()}
            disabled={pending}
          >
            Повторить
          </button>
        </p>
      ) : null}
    </div>
  );
}
