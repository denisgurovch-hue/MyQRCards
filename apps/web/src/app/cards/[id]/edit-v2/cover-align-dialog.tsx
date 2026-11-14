'use client';

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
} from 'react';
import {
  clampOffsets,
  withZoom,
  type FrameCropState,
} from '../../../../lib/photo-frame-crop';

type Props = {
  open: boolean;
  objectUrl: string;
  crop: FrameCropState;
  busy?: boolean;
  onCropChange: (crop: FrameCropState) => void;
  onCancel: () => void;
  onApply: () => void;
  onReset: () => void;
  onPickOther: () => void;
};

const MAX_ZOOM = 3;

/**
 * Prototype cover align: fixed wide frame (public cover band aspect).
 * Apply writes draft only — no upload.
 */
export function CoverAlignDialog({
  open,
  objectUrl,
  crop,
  busy = false,
  onCropChange,
  onCancel,
  onApply,
  onReset,
  onPickOther,
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
    const next = {
      ...crop,
      offsetX: drag.originX + (event.clientX - drag.startX),
      offsetY: drag.originY + (event.clientY - drag.startY),
    };
    onCropChange({ ...next, ...clampOffsets(next) });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="edit-v2-cover-align"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="edit-v2-cover-align-inner">
        <header className="edit-v2-cover-align-head">
          <h2 id={titleId} className="edit-v2-cover-align-title">
            Кадр фона
          </h2>
          <button type="button" className="button secondary" onClick={onCancel}>
            Отмена
          </button>
        </header>

        <div className="edit-v2-cover-align-body">
          <p className="muted" style={{ margin: 0 }}>
            Перетащите изображение и подгоните масштаб. В рамку попадёт то, что
            станет фоном визитки.
          </p>

          <div
            className="edit-v2-cover-align-frame"
            style={{ width: crop.frameWidth, height: crop.frameHeight }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="img"
            aria-label="Область кадрирования фона"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              className="edit-v2-cover-align-image"
              style={{
                width: crop.imageWidth * scale,
                height: crop.imageHeight * scale,
                transform: `translate(${crop.offsetX}px, ${crop.offsetY}px)`,
              }}
            />
          </div>

          <label className="edit-v2-cover-align-zoom">
            Масштаб
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(event) =>
                onCropChange(withZoom(crop, Number(event.target.value)))
              }
            />
          </label>
        </div>

        <footer className="edit-v2-cover-align-foot">
          <button
            type="button"
            className="button accent"
            disabled={busy}
            onClick={onApply}
          >
            {busy ? 'Готовим…' : 'Применить'}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onReset}
          >
            Сброс
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onPickOther}
          >
            Заменить фото
          </button>
        </footer>
      </div>
    </dialog>
  );
}
