import type { Card, CardLink } from '@prisma/client';

export type CardWithLinks = Card & { links: CardLink[] };

export type PublicCardDto = {
  slug: string;
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  summary: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  links: Array<{
    type: string | null;
    label: string | null;
    url: string;
  }>;
};

/**
 * Explicit allowlist serializer for public responses.
 * Never spreads Prisma entities; never leaks showEmail/userId/status.
 */
export function toPublicCardDto(card: CardWithLinks): PublicCardDto {
  const email = card.showEmail && card.email ? card.email : null;

  return {
    slug: card.slug,
    displayName: card.displayName,
    jobTitle: card.jobTitle,
    companyName: card.companyName,
    summary: card.summary,
    photoUrl: card.photoUrl,
    phone: card.phone,
    email,
    websiteUrl: card.websiteUrl,
    links: [...card.links]
      .sort((a, b) => a.position - b.position)
      .map((link) => ({
        type: link.type,
        label: link.label,
        url: link.url,
      })),
  };
}
