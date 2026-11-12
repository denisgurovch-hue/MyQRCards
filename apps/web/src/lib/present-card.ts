import type { PublicCard } from './public-card.types';

export type OwnerCardForPresent = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  showEmail: boolean;
  websiteUrl: string | null;
  photoUrl: string | null;
  slug: string;
  status: string;
  links: Array<{
    id?: string;
    type: string | null;
    label: string | null;
    url: string;
    position?: number;
  }>;
};

export type PresentCardView = PublicCard & {
  id: string;
  status: string;
  canSharePublic: boolean;
};

export type PresentShareActions = {
  showQr: boolean;
  showPublicLink: boolean;
  showOpenPublic: boolean;
  showPreviewNotice: boolean;
};

/**
 * Owner GET returns raw email even when showEmail=false.
 * Presentation must follow public visibility rules.
 */
export function toPresentCardView(card: OwnerCardForPresent): PresentCardView {
  const email = card.showEmail && card.email ? card.email : null;

  return {
    id: card.id,
    slug: card.slug,
    status: card.status,
    displayName: card.displayName,
    jobTitle: card.jobTitle,
    companyName: card.companyName,
    summary: card.summary,
    photoUrl: card.photoUrl,
    phone: card.phone,
    email,
    websiteUrl: card.websiteUrl,
    links: (card.links ?? []).map((link) => ({
      type: link.type,
      label: link.label,
      url: link.url,
    })),
    canSharePublic: card.status === 'published',
  };
}

export function presentShareActions(status: string): PresentShareActions {
  const published = status === 'published';
  return {
    showQr: published,
    showPublicLink: published,
    showOpenPublic: published,
    showPreviewNotice: status === 'draft' || status === 'archived',
  };
}

export const PRESENT_PREVIEW_NOTICE =
  'Предпросмотр. Визитка не опубликована — QR-код и публичная ссылка недоступны';
