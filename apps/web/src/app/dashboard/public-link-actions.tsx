'use client';

import { publicCardPath } from '../../lib/public-url';

type Props = {
  slug: string;
  status: string;
};

export function PublicLinkActions({ slug, status }: Props) {
  if (status !== 'published') {
    return (
      <p className="muted card-action-note">
        Опубликуйте визитку, чтобы получить публичную ссылку и QR-код.
      </p>
    );
  }

  const path = publicCardPath(slug);

  return (
    <a className="button secondary" href={path} target="_blank" rel="noreferrer">
      Открыть визитку
    </a>
  );
}
