'use client';

import { useEffect, useState } from 'react';
import { publicCardAbsoluteUrl, publicCardPath } from '../../../../lib/public-url';
import { fetchQrBlob, triggerDownload } from '../../../../lib/qr-download';

type Props = {
  slug: string;
  displayName: string;
  enabled: boolean;
  onShareUnavailable?: () => void;
};

type QrState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; objectUrl: string }
  | { kind: 'unavailable'; message: string };

export function PresentSharePanel({
  slug,
  displayName,
  enabled,
  onShareUnavailable,
}: Props) {
  const [qr, setQr] = useState<QrState>({ kind: 'idle' });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [shareBlocked, setShareBlocked] = useState(false);

  useEffect(() => {
    if (shareBlocked) {
      return;
    }
    if (!enabled) {
      setQr({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setQr({ kind: 'loading' });
    setDownloadError(null);

    void (async () => {
      try {
        const blob = await fetchQrBlob(slug, 'png');
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setQr({ kind: 'ready', objectUrl });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status?: number }).status)
            : undefined;
        const message =
          error instanceof Error
            ? error.message
            : 'Не удалось загрузить QR-код.';
        if (status === 404) {
          setShareBlocked(true);
          onShareUnavailable?.();
          setQr({
            kind: 'unavailable',
            message:
              'Публичное распространение недоступно. Визитка снята с публикации или недоступна.',
          });
          return;
        }
        setQr({ kind: 'unavailable', message });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [enabled, shareBlocked, slug, onShareUnavailable]);

  if (qr.kind === 'unavailable') {
    return (
      <div className="present-share" role="status">
        <p className="present-notice">{qr.message}</p>
      </div>
    );
  }

  if (!enabled) {
    return null;
  }

  const absolute = publicCardAbsoluteUrl(slug);
  const path = publicCardPath(slug);

  async function onDownload(format: 'png' | 'svg') {
    setDownloadError(null);
    try {
      const blob = await fetchQrBlob(slug, format);
      triggerDownload(blob, `qrcard-${slug}.${format}`);
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? Number((error as { status?: number }).status)
          : undefined;
      if (status === 404) {
        setShareBlocked(true);
        onShareUnavailable?.();
        setQr({
          kind: 'unavailable',
          message:
            'Публичное распространение недоступно. Визитка снята с публикации или недоступна.',
        });
        return;
      }
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Не удалось скачать QR-код.',
      );
    }
  }

  async function onCopy() {
    setCopied(false);
    setManualUrl(null);
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      setManualUrl(absolute);
    }
  }

  return (
    <div className="present-share">
      <h2 className="present-share-title">Передать контакт</h2>
      <p className="present-share-url">{absolute}</p>

      {qr.kind === 'loading' ? (
        <p className="muted" role="status">
          Загрузка QR-кода…
        </p>
      ) : null}

      {qr.kind === 'ready' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="present-qr"
          src={qr.objectUrl}
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

      <div className="present-share-actions">
        <button type="button" className="button" onClick={() => void onDownload('png')}>
          Скачать PNG
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => void onDownload('svg')}
        >
          Скачать SVG
        </button>
        <a className="button secondary" href={path} target="_blank" rel="noreferrer">
          Открыть визитку
        </a>
        <button type="button" className="button secondary" onClick={() => void onCopy()}>
          Копировать ссылку
        </button>
      </div>
      {copied ? <p className="muted">Ссылка скопирована</p> : null}
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          aria-label="Публичная ссылка"
          onFocus={(event) => event.currentTarget.select()}
          className="card-action-url"
        />
      ) : null}
    </div>
  );
}
