'use client';

import { useState } from 'react';
import type { PublicCard } from '../../../lib/public-card.types';
import {
  safeHttpUrl,
  safeMailtoHref,
  safeTelHref,
} from '../../../lib/safe-url';

type Props = {
  card: PublicCard;
};

export function PublicCardView({ card }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = safeHttpUrl(card.photoUrl);
  const phoneHref = safeTelHref(card.phone);
  const emailHref = safeMailtoHref(card.email);
  const websiteHref = safeHttpUrl(card.websiteUrl);
  const links = card.links
    .map((link) => ({
      ...link,
      href: safeHttpUrl(link.url),
    }))
    .filter((link) => link.href);

  const actions: Array<{ href: string; label: string; external?: boolean }> =
    [];
  if (phoneHref && card.phone) {
    actions.push({ href: phoneHref, label: `Позвонить · ${card.phone}` });
  }
  if (emailHref && card.email) {
    actions.push({ href: emailHref, label: `Написать · ${card.email}` });
  }
  if (websiteHref) {
    actions.push({ href: websiteHref, label: 'Сайт', external: true });
  }
  for (const link of links) {
    actions.push({
      href: link.href!,
      label: link.label?.trim() || link.type || link.href!,
      external: true,
    });
  }

  return (
    <section className="public-card">
      <div className="public-photo-wrap" aria-hidden={!(photoUrl && !photoFailed)}>
        {photoUrl && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="public-photo"
            src={photoUrl}
            alt=""
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div className="public-photo-fallback">
            {card.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <h1 className="public-name">{card.displayName}</h1>

      {card.jobTitle ? <p className="public-meta">{card.jobTitle}</p> : null}
      {card.companyName ? (
        <p className="public-meta">{card.companyName}</p>
      ) : null}
      {card.summary ? <p className="public-summary">{card.summary}</p> : null}

      {actions.length > 0 ? (
        <nav className="public-actions" aria-label="Контакты">
          {actions.map((action) => (
            <a
              key={`${action.href}-${action.label}`}
              className="public-action"
              href={action.href}
              {...(action.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {action.label}
            </a>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
