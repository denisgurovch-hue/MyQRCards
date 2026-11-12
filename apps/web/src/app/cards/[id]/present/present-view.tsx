'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  PRESENT_PREVIEW_NOTICE,
  presentShareActions,
  type PresentCardView,
} from '../../../../lib/present-card';
import {
  safeHttpUrl,
  safeMailtoHref,
  safeTelHref,
} from '../../../../lib/safe-url';
import {
  PresentContactIcon,
  resolvePresentContactKind,
} from './present-contact-icon';
import { PresentQrBlock, type QrViewState } from './present-qr-block';

type Props = {
  card: PresentCardView;
};

type ContactRow = {
  key: string;
  label: string;
  href: string | null;
  type?: string | null;
  url?: string | null;
};

export function PresentView({ card }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(card.canSharePublic);
  const [qrState, setQrState] = useState<QrViewState>({ kind: 'idle' });
  const previewOnly = presentShareActions(card.status).showPreviewNotice;

  const onShareUnavailable = useCallback(() => {
    setShareEnabled(false);
  }, []);

  const photoUrl = safeHttpUrl(card.photoUrl);
  const metaLine = [card.jobTitle, card.companyName].filter(Boolean).join(' · ');

  const contacts = useMemo(() => {
    const rows: ContactRow[] = [];
    const phoneHref = safeTelHref(card.phone);
    if (card.phone && phoneHref) {
      rows.push({ key: 'phone', label: card.phone, href: phoneHref });
    }
    const emailHref = safeMailtoHref(card.email);
    if (card.email && emailHref) {
      rows.push({ key: 'email', label: card.email, href: emailHref });
    }
    const websiteHref = safeHttpUrl(card.websiteUrl);
    if (websiteHref) {
      rows.push({
        key: 'website',
        label: websiteHref.replace(/^https?:\/\//, ''),
        href: websiteHref,
        url: websiteHref,
      });
    }
    for (const link of card.links) {
      const href = safeHttpUrl(link.url);
      if (!href) continue;
      rows.push({
        key: `${link.type ?? 'link'}-${href}`,
        label: link.label?.trim() || link.type || href,
        href,
        type: link.type,
        url: link.url,
      });
    }
    return rows;
  }, [card]);

  const showUnavailableNotice =
    qrState.kind === 'unavailable' ||
    (!shareEnabled && card.status === 'published');

  return (
    <main className="present-shell">
      <header className="present-top">
        <p className="brand brand-mark present-brand">
          Sign<span>et</span>
        </p>
        <Link className="button secondary" href="/dashboard">
          К списку визиток
        </Link>
      </header>

      <div className="present-stage phone-stage" aria-label="Визитка">
        <div className="phone-screen present-screen">
          <div className="phone-head">
            {photoUrl && !photoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="phone-avatar phone-avatar-photo"
                src={photoUrl}
                alt=""
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div className="phone-avatar" aria-hidden="true">
                {card.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="phone-name">{card.displayName}</h1>
              {metaLine ? <p className="phone-meta">{metaLine}</p> : null}
            </div>
          </div>

          <PresentQrBlock
            slug={card.slug}
            displayName={card.displayName}
            enabled={shareEnabled}
            onShareUnavailable={onShareUnavailable}
            onStateChange={setQrState}
          />

          {card.summary ? (
            <p className="present-screen-summary">{card.summary}</p>
          ) : null}

          {contacts.length > 0 ? (
            <ul className="phone-contacts">
              {contacts.map((row) => {
                const kind = resolvePresentContactKind(row);
                return (
                  <li key={row.key}>
                    <span className="phone-contact-icon">
                      <PresentContactIcon kind={kind} />
                    </span>
                    {row.href ? (
                      <a href={row.href} className="phone-contact-value">
                        {row.label}
                      </a>
                    ) : (
                      <span className="phone-contact-value">{row.label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {previewOnly ? (
        <p className="present-notice" role="status">
          {PRESENT_PREVIEW_NOTICE}
        </p>
      ) : null}

      {showUnavailableNotice ? (
        <p className="present-notice" role="status">
          {qrState.kind === 'unavailable'
            ? qrState.message
            : 'Публичное распространение недоступно. Визитка снята с публикации или недоступна.'}
        </p>
      ) : null}
    </main>
  );
}
