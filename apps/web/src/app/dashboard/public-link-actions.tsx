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
      <p className="muted card-action-note">
        Опубликуйте визитку, чтобы получить публичную ссылку и QR-код.
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
    <>
      <a className="button secondary" href={path} target="_blank" rel="noreferrer">
        Открыть визитку
      </a>
      <button type="button" className="button secondary" onClick={onCopy}>
        Копировать ссылку
      </button>
      {copied ? <span className="muted card-action-note">Ссылка скопирована</span> : null}
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          aria-label="Публичная ссылка"
          onFocus={(event) => event.currentTarget.select()}
          className="card-action-url"
        />
      ) : null}
    </>
  );
}
