'use client';

import { useState } from 'react';
import { publicCardAbsoluteUrl, publicCardPath } from '../../lib/public-url';

type Props = {
  slug: string;
  status: string;
};

export function PublicLinkActions({ slug, status }: Props) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  if (status !== 'published') {
    return (
      <p className="muted" style={{ margin: '0.4rem 0 0' }}>
        Опубликуйте визитку, чтобы получить публичную ссылку.
      </p>
    );
  }

  const absolute = publicCardAbsoluteUrl(slug);
  const path = publicCardPath(slug);

  async function onCopy() {
    setCopied(false);
    setManualUrl(null);
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      setManualUrl(absolute);
    }
  }

  return (
    <div className="card-row-actions">
      <a className="button secondary" href={path} target="_blank" rel="noreferrer">
        Открыть визитку
      </a>
      <button type="button" className="secondary" onClick={onCopy}>
        Копировать ссылку
      </button>
      {copied ? <span className="muted">Ссылка скопирована</span> : null}
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          aria-label="Публичная ссылка"
          onFocus={(event) => event.currentTarget.select()}
          style={{ width: '100%' }}
        />
      ) : null}
    </div>
  );
}
