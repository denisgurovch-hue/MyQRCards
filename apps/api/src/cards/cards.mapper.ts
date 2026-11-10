import type { Card, CardLink } from '@prisma/client';

export type CardWithLinks = Card & { links: CardLink[] };

export function toCardResponse(card: CardWithLinks) {
  return {
    id: card.id,
    displayName: card.displayName,
    jobTitle: card.jobTitle,
    companyName: card.companyName,
    summary: card.summary,
    phone: card.phone,
    email: card.email,
    showEmail: card.showEmail,
    websiteUrl: card.websiteUrl,
    photoUrl: card.photoUrl,
    slug: card.slug,
    status: card.status,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    links: [...card.links]
      .sort((a, b) => a.position - b.position)
      .map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        type: link.type,
        position: link.position,
      })),
  };
}
