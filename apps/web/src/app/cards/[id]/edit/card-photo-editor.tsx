'use client';

import { useEffect, useRef, useState } from 'react';

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

export function CardPhotoEditor({
  cardId,
  photoUrl,
  displayName,
  onPhotoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const initials = displayName.trim().slice(0, 1).toUpperCase() || '?';
  const shownUrl = previewUrl || (!imgFailed ? photoUrl : null);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  function onFilePicked(file: File | null) {
    if (!file) {
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  async function onUpload() {
    if (!pendingFile) {
      openPicker();
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('photo', pendingFile);
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPendingFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить фото');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="photo-editor" aria-label="Фото">
      <h2 className="section-title" style={{ fontSize: '1.15rem' }}>
        Фото
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        JPEG, PNG или WebP до 5 MB, не больше 4000×4000
      </p>

      <div className="photo-editor-preview">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownUrl}
            alt=""
            className="photo-editor-image"
            onError={() => {
              if (!previewUrl) {
                setImgFailed(true);
              }
            }}
          />
        ) : (
          <div className="photo-editor-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
      </div>

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
        {!photoUrl && !pendingFile ? (
          <button
            type="button"
            className="button secondary"
            onClick={openPicker}
            disabled={uploading}
          >
            Загрузить фото
          </button>
        ) : null}

        {pendingFile ? (
          <>
            <button
              type="button"
              className="button accent"
              onClick={() => void onUpload()}
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
          </>
        ) : null}

        {photoUrl && !pendingFile ? (
          <>
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
