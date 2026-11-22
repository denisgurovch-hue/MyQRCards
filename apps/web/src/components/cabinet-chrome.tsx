'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { LogoutButton } from '../app/dashboard/logout-button';
import { BrandMark } from './brand-mark';
import {
  CABINET_HUB_HREF,
  cabinetChromeActions,
  type CabinetNavContext,
} from './cabinet-nav';

function BackToCardsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.5 5.5 9 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12H20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type CabinetChromeProps = {
  context: CabinetNavContext;
  isAdmin?: boolean;
  /** Optional lede / title block under the brand. */
  title?: ReactNode;
  /** Dirty-guard for Signet / «К визиткам» / «Кабинет». */
  onHubNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Edit-only: open card lifecycle sheet. */
  onManage?: () => void;
  /** Extra actions after contextual ones (rare). */
  extraActions?: ReactNode;
  className?: string;
  brandClassName?: string;
};

/**
 * Shared cabinet header chrome (T-022).
 * Signet always → `/dashboard`; actions are context-scoped.
 */
export function CabinetChrome({
  context,
  isAdmin = false,
  title,
  onHubNavigate,
  onManage,
  extraActions,
  className,
  brandClassName,
}: CabinetChromeProps) {
  const actions = cabinetChromeActions(context, { isAdmin });
  const isPresent = context === 'present';
  const isEdit = context === 'edit';

  const brand = (
    <BrandMark
      href={CABINET_HUB_HREF}
      className={
        brandClassName ??
        (isPresent ? 'brand brand-mark present-brand' : 'brand brand-mark')
      }
      aria-label="Signet — к списку визиток"
      onClick={onHubNavigate}
    />
  );

  if (isPresent) {
    return (
      <header className={className ?? 'present-top'}>
        {brand}
      </header>
    );
  }

  if (isEdit) {
    return (
      <header className={className ?? 'edit-v2-top'}>
        <div className="edit-v2-top-brand-row">
          <div className="edit-v2-top-brand">{brand}</div>
          {actions.showBackToCards ? (
            <Link
              href={CABINET_HUB_HREF}
              className="button secondary edit-v2-back-icon"
              aria-label="К визиткам"
              title="К визиткам"
              onClick={onHubNavigate}
            >
              <BackToCardsIcon />
            </Link>
          ) : null}
        </div>
        {actions.showManage && onManage ? (
          <div className="edit-v2-top-actions">
            <div className="workspace-actions">
              <button
                type="button"
                className="button secondary edit-v2-manage"
                onClick={onManage}
              >
                Управление
              </button>
              {extraActions}
            </div>
          </div>
        ) : extraActions ? (
          <div className="edit-v2-top-actions">
            <div className="workspace-actions">{extraActions}</div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={className ?? 'workspace-top'}>
      <div className="workspace-top-brand-row">
        {brand}
        {actions.showLogout ? <LogoutButton /> : null}
      </div>
      {title}
      <div className="workspace-actions">
        {actions.showCreate ? (
          <Link className="button accent" href="/cards/new">
            Создать визитку
          </Link>
        ) : null}
        {actions.showAdmin ? (
          <Link className="button secondary" href="/admin">
            Админ
          </Link>
        ) : null}
        {actions.showAccount ? (
          <Link className="button secondary" href="/account">
            Аккаунт
          </Link>
        ) : null}
        {actions.showCabinet ? (
          <Link
            className="button secondary"
            href={CABINET_HUB_HREF}
            onClick={onHubNavigate}
          >
            Кабинет
          </Link>
        ) : null}
        {extraActions}
      </div>
    </header>
  );
}
