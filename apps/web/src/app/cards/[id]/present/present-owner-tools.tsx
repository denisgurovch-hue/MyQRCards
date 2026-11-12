'use client';

import { useState } from 'react';
import { publicCardAbsoluteUrl, publicCardPath } from '../../../../lib/public-url';
import { fetchQrBlob, triggerDownload } from '../../../../lib/qr-download';

type Props = {
  slug: string;
  enabled: boolean;
  onShareUnavailable?: () => void;
};

export function PresentOwnerTools({
  slug,
  enabled,
  onShareUnavailable,
}: Props) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

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
        onShareUnavailable?.();
        setDownloadError(
          'Публичное распространение недоступно. Визитка снята с публикации или недоступна.',
        );
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
    <div className="present-owner-tools">
      <p className="present-owner-url">{absolute}</p>
      {downloadError ? (
        <p className="error" role="alert">
          {downloadError}
        </p>
      ) : null}
      <div className="present-owner-actions">
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
