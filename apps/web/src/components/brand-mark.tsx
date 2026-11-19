import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { APP_VERSION } from '../lib/app-version';

type BrandMarkProps = {
  className?: string;
  /** When set, brand is a link (cabinet hub / home). */
  href?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Accessible name for the link; version is announced separately. */
  'aria-label'?: string;
  children?: ReactNode;
};

function BrandWordmark() {
  return (
    <>
      Sign<span>et</span>
      <span className="app-version" title={`Версия ${APP_VERSION}`}>
        {APP_VERSION}
      </span>
    </>
  );
}

/** Signet wordmark + muted product version. */
export function BrandMark({
  className = 'brand brand-mark',
  href,
  onClick,
  'aria-label': ariaLabel,
}: BrandMarkProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={ariaLabel ?? `Signet, версия ${APP_VERSION}`}
        onClick={onClick}
      >
        <BrandWordmark />
      </Link>
    );
  }

  return (
    <p className={className} aria-label={`Signet, версия ${APP_VERSION}`}>
      <BrandWordmark />
    </p>
  );
}

export { APP_VERSION };
