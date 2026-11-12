'use client';

import { useEffect, useState } from 'react';
import { fetchQrBlob } from '../../../../lib/qr-download';

type Props = {
  slug: string;
  displayName: string;
  enabled: boolean;
  onShareUnavailable?: () => void;
  onStateChange?: (state: QrViewState) => void;
};

export type QrViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; message: string; status?: number };

type InternalState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; objectUrl: string }
  | { kind: 'unavailable'; message: string; status?: number };

export function PresentQrBlock({
  slug,
  displayName,
  enabled,
  onShareUnavailable,
  onStateChange,
}: Props) {
  const [qr, setQr] = useState<InternalState>({ kind: 'idle' });
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (blocked) {
      return;
    }
    if (!enabled) {
      setQr({ kind: 'idle' });
      onStateChange?.({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setQr({ kind: 'loading' });
    onStateChange?.({ kind: 'loading' });

    void (async () => {
      try {
        const blob = await fetchQrBlob(slug, 'png');
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setQr({ kind: 'ready', objectUrl });
        onStateChange?.({ kind: 'ready' });
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
          setBlocked(true);
          onShareUnavailable?.();
        }
        const next = {
          kind: 'unavailable' as const,
          message:
            status === 404
              ? 'Публичное распространение недоступно. Визитка снята с публикации или недоступна.'
              : message,
          status,
        };
        setQr(next);
        onStateChange?.(next);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [blocked, enabled, slug, onShareUnavailable, onStateChange]);

  if (!enabled && qr.kind !== 'unavailable') {
    return null;
  }

  if (qr.kind === 'loading') {
    return (
      <div className="phone-qr present-qr-slot" role="status">
        <span className="present-qr-loading">…</span>
      </div>
    );
  }

  if (qr.kind === 'unavailable') {
    return null;
  }

  if (qr.kind !== 'ready') {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="phone-qr present-qr-image"
      src={qr.objectUrl}
      alt={`QR-код визитки ${displayName}`}
      width={160}
      height={160}
    />
  );
}
