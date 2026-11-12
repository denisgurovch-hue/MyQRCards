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

type Props = {
  cardId: string;
  coverColor: string | null;
  coverImageUrl: string | null;
  onCoverChange: (next: {
    coverColor?: string | null;
    coverImageUrl?: string | null;
  }) => void;
};

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const DEFAULT_COLOR = '#0B1520';
/** Editor frame ≈ public cover band aspect (wide strip). */
const COVER_FRAME_WIDTH = 360;
const COVER_FRAME_HEIGHT = 152;
const COVER_EXPORT_WIDTH = 1600;
const COVER_EXPORT_HEIGHT = 675;
const MAX_ZOOM = 3;

type AlignSession = {
  objectUrl: string;
  crop: FrameCropState;
};

export function CardCoverEditor({
  cardId,
  coverColor,
  coverImageUrl,
  onCoverChange,
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localColor, setLocalColor] = useState(coverColor ?? DEFAULT_COLOR);

  const sessionObjectUrl = session?.objectUrl ?? null;
  useEffect(() => {
    if (!sessionObjectUrl?.startsWith('blob:')) {
      return;
    }
    return () => {
      URL.revokeObjectURL(sessionObjectUrl);
    };
  }, [sessionObjectUrl]);

  useEffect(() => {
    setLocalColor(coverColor ?? DEFAULT_COLOR);
  }, [coverColor]);

  const aligning = Boolean(session);

  function clearSession() {
    setSession(null);
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
        COVER_FRAME_WIDTH,
        COVER_FRAME_HEIGHT,
      );
      setSession({ objectUrl: src, crop });
    } catch (err) {
      if (revokeOnFail && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
      setError(
        err instanceof Error ? err.message : 'Не удалось открыть изображение',
      );
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

  async function saveColor(next: string | null) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/cards/${encodeURIComponent(cardId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverColor: next }),
      });
      if (!response.ok) {
        throw new Error('Не удалось сохранить цвет обложки');
      }
      const data = (await response.json()) as {
        card: { coverColor: string | null };
      };
      onCoverChange({ coverColor: data.card.coverColor });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить цвет');
    } finally {
      setPending(false);
    }
  }

  async function onSaveAligned() {
    if (!session) {
      inputRef.current?.click();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const image = await loadHtmlImage(session.objectUrl);
      const blob = await exportFramedJpeg(
        image,
        session.crop,
        COVER_EXPORT_WIDTH,
        COVER_EXPORT_HEIGHT,
      );
      const body = new FormData();
      body.set('cover', blob, 'cover.jpg');
      const response = await fetch(
        `/api/v1/cards/${encodeURIComponent(cardId)}/cover`,
        {
          method: 'POST',
          credentials: 'include',
          body,
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          text.includes('5 MB') || response.status === 400
            ? 'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB'
            : 'Не удалось загрузить обложку',
        );
      }
      const data = (await response.json()) as { photo: { url: string } };
      onCoverChange({ coverImageUrl: data.photo.url });
      clearSession();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось загрузить обложку',
      );
    } finally {
      setPending(false);
    }
  }

  async function removeImage() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/cards/${encodeURIComponent(cardId)}/cover`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error('Не удалось удалить обложку');
      }
      onCoverChange({ coverImageUrl: null });
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить обложку');
    } finally {
      setPending(false);
    }
  }

  const scale =
    session == null
      ? 1
      : Math.max(
          session.crop.frameWidth / session.crop.imageWidth,
          session.crop.frameHeight / session.crop.imageHeight,
        ) * session.crop.zoom;

  const previewStyle = coverImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, transparent 55%, #e8eef4 100%), url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }
    : {
        background: `linear-gradient(180deg, ${localColor} 0%, ${localColor} 55%, #e8eef4 55%, #f5f8fb 100%)`,
      };

  return (
    <fieldset className="cover-editor" disabled={pending}>
      <legend>Обложка публичной страницы</legend>
      <p className="muted" style={{ marginTop: 0 }}>
        Верхний фон на `/u/…`: цвет или изображение. Перетащите фото внутри рамки
        и подгоните масштаб — как у фото профиля. На экран «Показать визитку» не
        влияет.
      </p>

      {aligning && session ? (
        <div className="cover-aligner">
          <div
            className="cover-aligner-frame"
            style={{
              width: session.crop.frameWidth,
              height: session.crop.frameHeight,
            }}
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
              disabled={pending}
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
        <div className="cover-editor-preview" style={previewStyle} aria-hidden="true" />
      )}

      {!aligning ? (
        <div className="cover-editor-row">
          <label className="cover-color-label" htmlFor="coverColor">
            Цвет
          </label>
          <input
            id="coverColor"
            type="color"
            value={localColor}
            disabled={pending}
            onChange={(event) => setLocalColor(event.target.value.toUpperCase())}
            onBlur={() => {
              if (
                localColor.toUpperCase() !==
                (coverColor ?? DEFAULT_COLOR).toUpperCase()
              ) {
                void saveColor(localColor.toUpperCase());
              }
            }}
          />
          <button
            type="button"
            className="button secondary"
            disabled={pending || !coverColor}
            onClick={() => void saveColor(null)}
          >
            Сбросить цвет
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => onFilePicked(event.target.files?.[0] ?? null)}
      />

      <div className="cover-editor-row">
        {aligning ? (
          <>
            <button
              type="button"
              className="button accent"
              disabled={pending}
              onClick={() => void onSaveAligned()}
            >
              {pending ? 'Сохраняем…' : 'Сохранить обложку'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              Выбрать другое
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={clearSession}
            >
              Отмена
            </button>
          </>
        ) : null}

        {!aligning && !coverImageUrl ? (
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            Загрузить изображение
          </button>
        ) : null}

        {!aligning && coverImageUrl ? (
          <>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => void beginAlign(coverImageUrl)}
            >
              Подогнать
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              Заменить изображение
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => void removeImage()}
            >
              Убрать изображение
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
