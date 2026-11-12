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
import { PresentSharePanel } from './present-share-panel';

type Props = {
  card: PresentCardView;
};

type ContactRow = {
  key: string;
  label: string;
  href: string | null;
};

export function PresentView({ card }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(card.canSharePublic);
  const previewOnly = presentShareActions(card.status).showPreviewNotice;

  const onShareUnavailable = useCallback(() => {
    setShareEnabled(false);
  }, []);

  const photoUrl = safeHttpUrl(card.photoUrl);
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
      rows.push({ key: 'website', label: websiteHref, href: websiteHref });
    }
    for (const link of card.links) {
      const href = safeHttpUrl(link.url);
      if (!href) continue;
      rows.push({
        key: `${link.type ?? 'link'}-${href}`,
        label: link.label?.trim() || link.type || href,
        href,
      });
    }
    return rows;
  }, [card]);

  return (
    <main className="present-shell">
      <header className="present-top">
        <p className="brand brand-mark">
          Sign<span>et</span>
        </p>
        <Link className="button secondary" href="/dashboard">
          К списку визиток
        </Link>
      </header>

      <div className="present-layout">
        <section className="present-card" aria-label="Визитка">
          <div className="present-card-inner">
            <div className="present-head">
              {photoUrl && !photoFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="present-avatar present-avatar-photo"
                  src={photoUrl}
                  alt=""
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className="present-avatar" aria-hidden="true">
                  {card.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="present-name">{card.displayName}</h1>
                {card.jobTitle ? (
                  <p className="present-meta">{card.jobTitle}</p>
                ) : null}
                {card.companyName ? (
                  <p className="present-meta">{card.companyName}</p>
                ) : null}
              </div>
            </div>

            {card.summary ? (
              <p className="present-summary">{card.summary}</p>
            ) : null}

            {contacts.length > 0 ? (
              <ul className="present-contacts">
                {contacts.map((row) => (
                  <li key={row.key}>
                    {row.href ? (
                      <a href={row.href} className="present-contact-value">
                        {row.label}
                      </a>
                    ) : (
                      <span className="present-contact-value">{row.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <aside className="present-side">
          {previewOnly ? (
            <p className="present-notice" role="status">
              {PRESENT_PREVIEW_NOTICE}
            </p>
          ) : null}

          <PresentSharePanel
            slug={card.slug}
            displayName={card.displayName}
            enabled={shareEnabled}
            onShareUnavailable={onShareUnavailable}
          />
        </aside>
      </div>
    </main>
  );
}
