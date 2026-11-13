'use client';

import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
} from 'react';
import {
  clampOffsets,
  nudgeOffsets,
  withZoom,
  type FrameCropState,
} from '../../../../lib/photo-frame-crop';

type Props = {
  open: boolean;
  objectUrl: string;
  crop: FrameCropState;
  uploading: boolean;
  error: string | null;
  onCropChange: (crop: FrameCropState) => void;
  onCancel: () => void;
  onSave: () => void;
  onPickOther: () => void;
  onReset: () => void;
  onRotate: () => void;
};

const NUDGE_PX = 12;
const MAX_ZOOM = 3;

export function PhotoCropDialog({
  open,
  objectUrl,
  crop,
  uploading,
  error,
  onCropChange,
  onCancel,
  onSave,
  onPickOther,
  onReset,
  onRotate,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const focusable = dialog.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      );
      focusable?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [open]);

  const scale =
    Math.max(
      crop.frameWidth / crop.imageWidth,
      crop.frameHeight / crop.imageHeight,
    ) * crop.zoom;

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: crop.offsetX,
      originY: crop.offsetY,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    onCropChange({
      ...crop,
      ...clampOffsets({
        ...crop,
        offsetX: drag.originX + (event.clientX - drag.startX),
        offsetY: drag.originY + (event.clientY - drag.startY),
      }),
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function onFrameKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const map: Record<string, [number, number]> = {
      ArrowLeft: [NUDGE_PX, 0],
      ArrowRight: [-NUDGE_PX, 0],
      ArrowUp: [0, NUDGE_PX],
      ArrowDown: [0, -NUDGE_PX],
    };
    const delta = map[event.key];
    if (!delta) {
      return;
    }
    event.preventDefault();
    onCropChange(nudgeOffsets(crop, delta[0], delta[1]));
  }

  return (
    <dialog
      ref={dialogRef}
      className="photo-crop-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!uploading) {
          onCancel();
        }
      }}
    >
      <div className="photo-crop-dialog-inner">
        <header className="photo-crop-dialog-head">
          <h2 id={titleId} className="photo-crop-dialog-title">
            Кадр фото
          </h2>
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            disabled={uploading}
          >
            Отмена
          </button>
        </header>

        <div className="photo-crop-dialog-body">
          <div
            className="photo-crop-frame"
            style={{ width: crop.frameWidth, height: crop.frameHeight }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onFrameKeyDown}
            role="group"
            aria-label="Область кадрирования. Перетащите фото или смещайте стрелками клавиатуры."
            tabIndex={0}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt=""
              className="photo-crop-image"
              draggable={false}
              style={{
                width: crop.imageWidth * scale,
                height: crop.imageHeight * scale,
                transform: `translate(${crop.offsetX}px, ${crop.offsetY}px)`,
              }}
            />
            <div className="photo-crop-guide" aria-hidden="true" />
          </div>

          <label className="photo-crop-zoom">
            Масштаб
            <div className="photo-crop-zoom-row">
              <button
                type="button"
                className="button secondary photo-crop-icon-btn"
                aria-label="Уменьшить"
                disabled={uploading || crop.zoom <= 1}
                onClick={() =>
                  onCropChange(withZoom(crop, Math.max(1, crop.zoom - 0.1)))
                }
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                disabled={uploading}
                onChange={(event) =>
                  onCropChange(withZoom(crop, Number(event.target.value)))
                }
              />
              <button
                type="button"
                className="button secondary photo-crop-icon-btn"
                aria-label="Увеличить"
                disabled={uploading || crop.zoom >= MAX_ZOOM}
                onClick={() =>
                  onCropChange(
                    withZoom(crop, Math.min(MAX_ZOOM, crop.zoom + 0.1)),
                  )
                }
              >
                +
              </button>
            </div>
          </label>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {uploading ? <p className="muted">Сохраняем фото…</p> : null}
        </div>

        <footer className="photo-crop-dialog-foot">
          <button
            type="button"
            className="button accent"
            onClick={onSave}
            disabled={uploading}
          >
            {uploading ? 'Сохраняем…' : 'Сохранить фото'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={onRotate}
            disabled={uploading}
          >
            Повернуть 90°
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={onReset}
            disabled={uploading}
          >
            Сброс
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={onPickOther}
            disabled={uploading}
          >
            Заменить фото
          </button>
        </footer>
      </div>
    </dialog>
  );
}
