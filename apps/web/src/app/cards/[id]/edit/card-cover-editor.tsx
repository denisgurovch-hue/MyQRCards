'use client';

import { useEffect, useRef, useState } from 'react';

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

export function CardCoverEditor({
  cardId,
  coverColor,
  coverImageUrl,
  onCoverChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localColor, setLocalColor] = useState(coverColor ?? DEFAULT_COLOR);

  useEffect(() => {
    setLocalColor(coverColor ?? DEFAULT_COLOR);
  }, [coverColor]);

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

  async function onPickFile(file: File | null) {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('cover', file);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить обложку');
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить обложку');
    } finally {
      setPending(false);
    }
  }

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
        Верхний фон на `/u/…`: цвет или изображение. На экран «Показать визитку» не
        влияет.
      </p>

      <div className="cover-editor-preview" style={previewStyle} aria-hidden="true" />

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
            if (localColor.toUpperCase() !== (coverColor ?? DEFAULT_COLOR).toUpperCase()) {
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

      <div className="cover-editor-row">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(event) => void onPickFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {coverImageUrl ? 'Заменить изображение' : 'Загрузить изображение'}
        </button>
        {coverImageUrl ? (
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() => void removeImage()}
          >
            Убрать изображение
          </button>
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
