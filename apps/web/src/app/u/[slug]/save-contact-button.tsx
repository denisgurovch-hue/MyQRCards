'use client';

import { useRef, useState } from 'react';

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
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer revoke: immediate revoke races the download handoff on mobile Safari.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

export function SaveContactButton({ slug }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
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
      // iOS Safari often leaves the label unpainted after a download/share sheet
      // if the control was disabled mid-tap; blur forces a fresh paint.
      requestAnimationFrame(() => {
        buttonRef.current?.blur();
      });
    }
  }

  return (
    <div className="public-vcard">
      <button
        ref={buttonRef}
        type="button"
        className="public-action public-action-secondary"
        onClick={() => void onSave()}
        aria-busy={pending}
        aria-disabled={pending}
        data-pending={pending ? 'true' : undefined}
      >
        {/* Keep both labels mounted so WebKit does not drop the text node paint. */}
        <span className="public-action-label" hidden={pending}>
          Сохранить контакт
        </span>
        <span className="public-action-label" hidden={!pending}>
          Готовим файл…
        </span>
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
            aria-disabled={pending}
          >
            Повторить
          </button>
        </p>
      ) : null}
    </div>
  );
}
