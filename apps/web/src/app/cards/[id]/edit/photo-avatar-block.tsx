'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  photoUrl: string | null;
  displayName: string;
  busy: boolean;
  onAddPhoto: () => void;
  onChooseOther: () => void;
  onRequestDelete: () => void;
};

export function PhotoAvatarBlock({
  photoUrl,
  displayName,
  busy,
  onAddPhoto,
  onChooseOther,
  onRequestDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const hasPhoto = Boolean(photoUrl) && !imgFailed;
  const initials = displayName.trim().slice(0, 1).toUpperCase() || '?';

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="photo-avatar-block">
      <div className="photo-avatar-stage" ref={rootRef}>
        <div className="photo-avatar-preview">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl!}
              alt=""
              className="photo-avatar-image"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="photo-avatar-fallback" aria-hidden="true">
              {initials}
            </div>
          )}

          {hasPhoto ? (
            <button
              type="button"
              className="photo-avatar-quiet"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              disabled={busy}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Изменить
            </button>
          ) : (
            <button
              type="button"
              className="photo-avatar-quiet"
              disabled={busy}
              onClick={onAddPhoto}
            >
              Добавить фото
            </button>
          )}
        </div>

        {menuOpen && hasPhoto ? (
          <div
            id={menuId}
            className="photo-avatar-menu"
            role="menu"
            aria-label="Действия с фото"
          >
            <button
              type="button"
              role="menuitem"
              className="photo-avatar-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onChooseOther();
              }}
            >
              Выбрать другое фото
            </button>
            <button
              type="button"
              role="menuitem"
              className="photo-avatar-menu-item is-danger"
              onClick={() => {
                setMenuOpen(false);
                onRequestDelete();
              }}
            >
              Удалить фото
            </button>
            <button
              type="button"
              role="menuitem"
              className="photo-avatar-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              Отмена
            </button>
          </div>
        ) : null}
      </div>

      <p className="muted photo-avatar-hint">
        JPEG, PNG или WebP до 5 MB, не больше 4000×4000.
      </p>
    </div>
  );
}
