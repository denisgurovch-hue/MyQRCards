'use client';

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  clampOffsets,
  exportFramedJpeg,
  initialCropState,
  loadHtmlImage,
  withZoom,
  type FrameCropState,
} from '../../../../lib/photo-frame-crop';

type PhotoPayload = {
  id: string;
  url: string;
  width: number;
  height: number;
  mime_type: string;
};

type Props = {
  cardId: string;
  photoUrl: string | null;
  displayName: string;
  onPhotoChange: (photoUrl: string | null) => void;
};

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const FRAME_SIZE = 240;
const MAX_ZOOM = 3;

type AlignSession = {
  objectUrl: string;
  crop: FrameCropState;
};

export function CardPhotoEditor({
  cardId,
  photoUrl,
  displayName,
  onPhotoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [session, setSession] = useState<AlignSession | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    return () => {
      if (session?.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(session.objectUrl);
      }
    };
  }, [session]);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const initials = displayName.trim().slice(0, 1).toUpperCase() || '?';
  const aligning = Boolean(session);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  function clearSession() {
    setSession((current) => {
      if (current?.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return null;
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function beginAlign(src: string, revokeOnFail = false) {
    setError(null);
    try {
      const image = await loadHtmlImage(src);
      const crop = initialCropState(
        image.naturalWidth,
        image.naturalHeight,
        FRAME_SIZE,
      );
      setSession((current) => {
        if (current?.objectUrl.startsWith('blob:') && current.objectUrl !== src) {
          URL.revokeObjectURL(current.objectUrl);
        }
        return { objectUrl: src, crop };
      });
    } catch (err) {
      if (revokeOnFail && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
      setError(err instanceof Error ? err.message : 'Не удалось открыть изображение');
    }
  }

  function onFilePicked(file: File | null) {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    void beginAlign(url, true);
  }

  function updateCrop(patch: Partial<FrameCropState>) {
    setSession((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current.crop, ...patch };
      const clamped = clampOffsets(next);
      return {
        ...current,
        crop: { ...next, ...clamped },
      };
    });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!session) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: session.crop.offsetX,
      originY: session.crop.offsetY,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    updateCrop({
      offsetX: drag.originX + (event.clientX - drag.startX),
      offsetY: drag.originY + (event.clientY - drag.startY),
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  async function onSaveAligned() {
    if (!session) {
      openPicker();
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const image = await loadHtmlImage(session.objectUrl);
      const blob = await exportFramedJpeg(image, session.crop);
      const body = new FormData();
      body.append('photo', blob, 'avatar.jpg');
      const response = await fetch(
        `/api/v1/cards/${encodeURIComponent(cardId)}/photo`,
        {
          method: 'POST',
          body,
          credentials: 'include',
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { photo?: PhotoPayload; error?: { message?: string } }
        | null;
      if (!response.ok) {
        throw new Error(
          data?.error?.message ??
            'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
        );
      }
      if (!data?.photo?.url) {
        throw new Error('Не удалось загрузить фото');
      }
      onPhotoChange(data.photo.url);
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  }

  async function onDelete() {
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/cards/${encodeURIComponent(cardId)}/photo`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { photo?: null; error?: { message?: string } }
        | null;
      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'Не удалось удалить фото');
      }
      onPhotoChange(null);
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить фото');
    } finally {
      setUploading(false);
    }
  }

  async function onAdjustExisting() {
    if (!photoUrl) {
      return;
    }
    await beginAlign(photoUrl);
  }

  const scale =
    session == null
      ? 1
      : Math.max(
          session.crop.frameSize / session.crop.imageWidth,
          session.crop.frameSize / session.crop.imageHeight,
        ) * session.crop.zoom;

  return (
    <section className="photo-editor" aria-label="Фото">
      <h2 className="section-title" style={{ fontSize: '1.15rem' }}>
        Фото
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        JPEG, PNG или WebP до 5 MB. Перетащите фото внутри рамки и подгоните масштаб.
      </p>

      {aligning && session ? (
        <div className="photo-aligner">
          <div
            className="photo-aligner-frame"
            style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="presentation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.objectUrl}
              alt=""
              className="photo-aligner-image"
              draggable={false}
              style={{
                width: session.crop.imageWidth * scale,
                height: session.crop.imageHeight * scale,
                transform: `translate(${session.crop.offsetX}px, ${session.crop.offsetY}px)`,
              }}
            />
          </div>
          <label className="photo-aligner-zoom">
            Масштаб
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={session.crop.zoom}
              disabled={uploading}
              onChange={(event) => {
                const zoom = Number(event.target.value);
                setSession((current) =>
                  current
                    ? { ...current, crop: withZoom(current.crop, zoom) }
                    : current,
                );
              }}
            />
          </label>
        </div>
      ) : (
        <div className="photo-editor-preview">
          {photoUrl && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="photo-editor-image"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="photo-editor-fallback" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {uploading ? <p className="muted">Загрузка фото…</p> : null}

      <div className="card-row-actions">
        {aligning ? (
          <>
            <button
              type="button"
              className="button accent"
              onClick={() => void onSaveAligned()}
              disabled={uploading}
            >
              {uploading ? 'Сохраняем…' : 'Сохранить фото'}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={openPicker}
              disabled={uploading}
            >
              Выбрать другое
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={clearSession}
              disabled={uploading}
            >
              Отмена
            </button>
          </>
        ) : null}

        {!aligning && !photoUrl ? (
          <button
            type="button"
            className="button secondary"
            onClick={openPicker}
            disabled={uploading}
          >
            Загрузить фото
          </button>
        ) : null}

        {!aligning && photoUrl ? (
          <>
            <button
              type="button"
              className="button secondary"
              onClick={() => void onAdjustExisting()}
              disabled={uploading}
            >
              Подогнать
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={openPicker}
              disabled={uploading}
            >
              Заменить фото
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => void onDelete()}
              disabled={uploading}
            >
              Удалить фото
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
