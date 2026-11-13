'use client';

import { useEffect, useRef, useState } from 'react';
import {
  exportFramedJpeg,
  initialCropState,
  loadHtmlImage,
  rotateImageClockwiseJpeg,
  type FrameCropState,
} from '../../../../lib/photo-frame-crop';
import {
  PHOTO_CLIENT_ACCEPT,
  validatePhotoSourceFile,
} from '../../../../lib/photo-source-limits';
import { PhotoAvatarBlock } from './photo-avatar-block';
import { PhotoCropDialog } from './photo-crop-dialog';

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

const FRAME_SIZE = 280;

type CropSession = {
  objectUrl: string;
  crop: FrameCropState;
  /** Baseline crop for «Сброс» (after last file pick / rotate). */
  initialCrop: FrameCropState;
};

export function CardPhotoEditor({
  cardId,
  photoUrl,
  displayName,
  onPhotoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<CropSession | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sessionObjectUrl = session?.objectUrl ?? null;
  useEffect(() => {
    if (!sessionObjectUrl?.startsWith('blob:')) {
      return;
    }
    return () => {
      URL.revokeObjectURL(sessionObjectUrl);
    };
  }, [sessionObjectUrl]);

  function openPicker() {
    setError(null);
    setConfirmDelete(false);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  function clearSession() {
    setSession(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function beginSessionFromObjectUrl(objectUrl: string) {
    const image = await loadHtmlImage(objectUrl);
    const crop = initialCropState(
      image.naturalWidth,
      image.naturalHeight,
      FRAME_SIZE,
    );
    setSession({ objectUrl, crop, initialCrop: crop });
  }

  async function onFilePicked(file: File | null) {
    if (!file) {
      return;
    }
    setError(null);
    try {
      await validatePhotoSourceFile(file);
      const objectUrl = URL.createObjectURL(file);
      try {
        await beginSessionFromObjectUrl(objectUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        throw err;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось открыть изображение',
      );
    }
  }

  async function onRotate() {
    if (!session || uploading) {
      return;
    }
    setError(null);
    try {
      const blob = await rotateImageClockwiseJpeg(session.objectUrl);
      const nextUrl = URL.createObjectURL(blob);
      try {
        const image = await loadHtmlImage(nextUrl);
        const crop = initialCropState(
          image.naturalWidth,
          image.naturalHeight,
          FRAME_SIZE,
        );
        // Previous blob revoked by sessionObjectUrl effect when URL changes.
        setSession({ objectUrl: nextUrl, crop, initialCrop: crop });
      } catch (err) {
        URL.revokeObjectURL(nextUrl);
        throw err;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось повернуть изображение',
      );
    }
  }

  async function onSave() {
    if (!session || uploading) {
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

  async function onDeleteConfirmed() {
    if (uploading) {
      return;
    }
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
      setConfirmDelete(false);
      clearSession();
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

      <PhotoAvatarBlock
        photoUrl={photoUrl}
        displayName={displayName}
        busy={uploading}
        onAddPhoto={openPicker}
        onChooseOther={openPicker}
        onRequestDelete={() => {
          setError(null);
          setConfirmDelete(true);
        }}
      />

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_CLIENT_ACCEPT}
        hidden
        onChange={(event) => void onFilePicked(event.target.files?.[0] ?? null)}
      />

      {confirmDelete ? (
        <div className="photo-delete-confirm" role="group" aria-label="Удаление фото">
          <p className="muted" style={{ margin: 0 }}>
            Удалить фото с визитки?
          </p>
          <div className="photo-delete-confirm-actions">
            <button
              type="button"
              className="button accent"
              disabled={uploading}
              onClick={() => void onDeleteConfirmed()}
            >
              {uploading ? 'Удаляем…' : 'Удалить'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={uploading}
              onClick={() => setConfirmDelete(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      {error && !session ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {session ? (
        <PhotoCropDialog
          open
          objectUrl={session.objectUrl}
          crop={session.crop}
          uploading={uploading}
          error={error}
          onCropChange={(crop) =>
            setSession((current) =>
              current ? { ...current, crop } : current,
            )
          }
          onCancel={() => {
            if (!uploading) {
              clearSession();
              setError(null);
            }
          }}
          onSave={() => void onSave()}
          onPickOther={openPicker}
          onReset={() =>
            setSession((current) =>
              current
                ? { ...current, crop: current.initialCrop }
                : current,
            )
          }
          onRotate={() => void onRotate()}
        />
      ) : null}
    </section>
  );
}
