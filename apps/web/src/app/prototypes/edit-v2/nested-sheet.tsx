'use client';

import { useEffect, useId, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * One nested-editor shell for mobile + desktop:
 * native dialog styled as bottom sheet ≤720px, centered panel on larger screens.
 */
export function NestedSheet({ open, title, onClose, children, footer }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="edit-v2-sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="edit-v2-sheet-inner">
        <header className="edit-v2-sheet-head">
          <h2 id={titleId} className="edit-v2-sheet-title">
            {title}
          </h2>
          <button type="button" className="button secondary" onClick={onClose}>
            Закрыть
          </button>
        </header>
        <div className="edit-v2-sheet-body">{children}</div>
        {footer ? <footer className="edit-v2-sheet-foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
