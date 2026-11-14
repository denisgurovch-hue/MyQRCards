export type CardLinkType =
  | 'telegram'
  | 'whatsapp'
  | 'max'
  | 'vk'
  | 'linkedin'
  | 'link';

export type EditorLink = {
  id: string;
  label: string;
  url: string;
  type: CardLinkType;
};

export type ContactOrderKey = 'phone' | 'email' | 'website' | (string & {});

export type CardDraft = {
  displayName: string;
  jobTitle: string;
  companyName: string;
  summary: string;
  phone: string;
  email: string;
  showEmail: boolean;
  websiteUrl: string;
  links: EditorLink[];
  contactOrder: ContactOrderKey[];
  photoUrl: string | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  slug: string;
  status: 'draft' | 'published' | 'archived' | string;
};

export type OwnerCard = {
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
  coverColor: string | null;
  coverImageUrl: string | null;
  slug: string;
  status: string;
  links: Array<{
    id?: string;
    label: string | null;
    url: string;
    type?: string | null;
    position?: number;
  }>;
};

const LINK_TYPES = new Set<CardLinkType>([
  'telegram',
  'whatsapp',
  'max',
  'vk',
  'linkedin',
  'link',
]);

export function normalizeLinkType(value: string | null | undefined): CardLinkType {
  const raw = (value ?? '').toLowerCase();
  if (LINK_TYPES.has(raw as CardLinkType)) {
    return raw as CardLinkType;
  }
  return 'link';
}

export function defaultContactOrder(links: EditorLink[] = []): ContactOrderKey[] {
  return ['phone', 'email', 'website', ...links.map((link) => link.id)];
}

export function normalizeContactOrder(
  order: ContactOrderKey[] | undefined,
  links: EditorLink[],
): ContactOrderKey[] {
  const linkIds = new Set(links.map((link) => link.id));
  const slots: ContactOrderKey[] = ['phone', 'email', 'website'];
  const base = order?.length ? order : defaultContactOrder(links);
  const seen = new Set<string>();
  const next: ContactOrderKey[] = [];
  for (const key of base) {
    if (seen.has(key)) continue;
    if (key === 'phone' || key === 'email' || key === 'website') {
      next.push(key);
      seen.add(key);
      continue;
    }
    if (linkIds.has(key)) {
      next.push(key);
      seen.add(key);
    }
  }
  for (const slot of slots) {
    if (!seen.has(slot)) {
      next.push(slot);
      seen.add(slot);
    }
  }
  for (const link of links) {
    if (!seen.has(link.id)) {
      next.push(link.id);
      seen.add(link.id);
    }
  }
  return next;
}

export function cloneDraft(draft: CardDraft): CardDraft {
  return {
    ...draft,
    links: draft.links.map((link) => ({ ...link })),
    contactOrder: [...draft.contactOrder],
  };
}

export function draftsEqual(a: CardDraft, b: CardDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

let linkSeq = 0;

export function nextLinkId(): string {
  linkSeq += 1;
  return `link-${Date.now().toString(36)}-${linkSeq}`;
}

export function ownerCardToDraft(card: OwnerCard): CardDraft {
  const links: EditorLink[] = [...card.links]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((link, index) => ({
      id: link.id ?? `server-link-${index}`,
      label: link.label ?? '',
      url: link.url,
      type: normalizeLinkType(link.type),
    }));

  return {
    displayName: card.displayName,
    jobTitle: card.jobTitle ?? '',
    companyName: card.companyName ?? '',
    summary: card.summary ?? '',
    phone: card.phone ?? '',
    email: card.email ?? '',
    showEmail: card.showEmail,
    websiteUrl: card.websiteUrl ?? '',
    links,
    contactOrder: defaultContactOrder(links),
    photoUrl: card.photoUrl,
    coverColor: card.coverColor,
    coverImageUrl: card.coverImageUrl,
    slug: card.slug,
    status: card.status,
  };
}

export function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
