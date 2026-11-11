'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { publicCardAbsoluteUrl } from '../../lib/public-url';

type Props = {
  slug: string;
  status: string;
  displayName: string;
};

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; objectUrl: string }
  | { kind: 'error'; message: string };

function qrEndpoint(slug: string, format: 'png' | 'svg') {
  return `/api/v1/public/cards/${encodeURIComponent(slug)}/qr.${format}`;
}

async function fetchQrBlob(
  slug: string,
  format: 'png' | 'svg',
): Promise<Blob> {
  const response = await fetch(qrEndpoint(slug, format), {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') ?? '';
  const okType =
    format === 'png'
      ? contentType.includes('image/png')
      : contentType.includes('image/svg');

  if (!response.ok || !okType) {
    throw new Error(
      response.status === 404
        ? 'Визитка недоступна для QR-кода. Опубликуйте её снова.'
        : 'Не удалось загрузить QR-код.',
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

export function QrActions({ slug, status, displayName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<LoadState>({ kind: 'idle' });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setPreview({ kind: 'loading' });
    setDownloadError(null);

    void (async () => {
      try {
        const blob = await fetchQrBlob(slug, 'png');
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setPreview({ kind: 'ready', objectUrl });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPreview({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить QR-код.',
        });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, slug]);

  function closeDialog() {
    setOpen(false);
    setPreview({ kind: 'idle' });
    setDownloadError(null);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  async function onDownload(format: 'png' | 'svg') {
    setDownloadError(null);
    try {
      const blob = await fetchQrBlob(slug, format);
      triggerDownload(blob, `qrcard-${slug}.${format}`);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Не удалось скачать QR-код.',
      );
    }
  }

  if (status !== 'published') {
    return null;
  }

  const absolute = publicCardAbsoluteUrl(slug);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        QR-код
      </button>

      <dialog
        ref={dialogRef}
        className="qr-dialog"
        aria-labelledby={titleId}
        onClose={closeDialog}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
      >
        <div className="qr-dialog-body">
          <h2 id={titleId} className="qr-dialog-title">
            QR-код · {displayName}
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {absolute}
          </p>

          {preview.kind === 'loading' ? (
            <p className="muted" role="status">
              Загрузка QR-кода…
            </p>
          ) : null}

          {preview.kind === 'error' ? (
            <p className="error" role="alert">
              {preview.message}
            </p>
          ) : null}

          {preview.kind === 'ready' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="qr-preview"
              src={preview.objectUrl}
              alt={`QR-код визитки ${displayName}`}
              width={240}
              height={240}
            />
          ) : null}

          {downloadError ? (
            <p className="error" role="alert">
              {downloadError}
            </p>
          ) : null}

          <div className="card-row-actions">
            <button
              type="button"
              onClick={() => void onDownload('png')}
              disabled={preview.kind === 'error'}
            >
              Скачать PNG
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void onDownload('svg')}
              disabled={preview.kind === 'error'}
            >
              Скачать SVG
            </button>
            <button type="button" className="secondary" onClick={closeDialog}>
              Закрыть
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
