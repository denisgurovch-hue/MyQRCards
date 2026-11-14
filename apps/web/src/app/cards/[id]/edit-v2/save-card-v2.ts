import type { CardDraft } from './card-draft';
import { normalizeContactOrder } from './card-draft';

export type MediaAction = 'keep' | 'upload' | 'delete';

export type CoverMode = 'default' | 'color' | 'image';

export type SavePlan = {
  patch: Record<string, unknown>;
  photo: MediaAction;
  coverImage: MediaAction;
};

export function resolveCoverMode(draft: CardDraft): CoverMode {
  if (draft.coverImageUrl) {
    return 'image';
  }
  if (draft.coverColor) {
    return 'color';
  }
  return 'default';
}

export function buildSavePlan(input: {
  draft: CardDraft;
  baseline: CardDraft;
  pendingPhotoBlob: Blob | null;
  pendingCoverBlob: Blob | null;
}): SavePlan {
  const { draft, baseline, pendingPhotoBlob, pendingCoverBlob } = input;
  const order = normalizeContactOrder(draft.contactOrder, draft.links);
  const orderedLinks = order
    .filter((key) => key !== 'phone' && key !== 'email' && key !== 'website')
    .map((id) => draft.links.find((link) => link.id === id))
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  const coverMode = resolveCoverMode(draft);
  const coverColor =
    coverMode === 'color' ? draft.coverColor || null : null;

  const patch: Record<string, unknown> = {
    displayName: draft.displayName.trim(),
    jobTitle: draft.jobTitle.trim() || null,
    companyName: draft.companyName.trim() || null,
    summary: draft.summary.trim() || null,
    phone: draft.phone.trim() || null,
    email: draft.email.trim() || null,
    showEmail: draft.showEmail,
    websiteUrl: draft.websiteUrl.trim() || null,
    slug: draft.slug.trim(),
    coverColor,
    links: orderedLinks.map((link, position) => ({
      url: link.url.trim(),
      label: link.label.trim() || undefined,
      type: link.type,
      position,
    })),
  };

  let photo: MediaAction = 'keep';
  if (pendingPhotoBlob) {
    photo = 'upload';
  } else if (!draft.photoUrl && baseline.photoUrl) {
    photo = 'delete';
  }

  let coverImage: MediaAction = 'keep';
  if (pendingCoverBlob) {
    coverImage = 'upload';
  } else if (coverMode !== 'image' && baseline.coverImageUrl) {
    coverImage = 'delete';
  } else if (coverMode === 'image' && !draft.coverImageUrl && baseline.coverImageUrl) {
    coverImage = 'delete';
  }

  return { patch, photo, coverImage };
}

export async function uploadCardMedia(
  cardId: string,
  kind: 'photo' | 'cover',
  blob: Blob,
): Promise<string> {
  const body = new FormData();
  const field = kind === 'photo' ? 'photo' : 'cover';
  const filename = kind === 'photo' ? 'avatar.jpg' : 'cover.jpg';
  body.append(field, blob, filename);
  const response = await fetch(
    `/api/v1/cards/${encodeURIComponent(cardId)}/${kind}`,
    {
      method: 'POST',
      body,
      credentials: 'include',
    },
  );
  const data = (await response.json().catch(() => null)) as
    | { photo?: { url?: string }; error?: { message?: string } }
    | null;
  if (!response.ok) {
    throw new Error(
      data?.error?.message ??
        'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
    );
  }
  if (!data?.photo?.url) {
    throw new Error(
      kind === 'photo' ? 'Не удалось загрузить фото' : 'Не удалось загрузить фон',
    );
  }
  return data.photo.url;
}

export async function deleteCardMedia(
  cardId: string,
  kind: 'photo' | 'cover',
): Promise<void> {
  const response = await fetch(
    `/api/v1/cards/${encodeURIComponent(cardId)}/${kind}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  );
  if (!response.ok && response.status !== 204) {
    const data = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(
      data?.error?.message ??
        (kind === 'photo'
          ? 'Не удалось удалить фото'
          : 'Не удалось удалить фон'),
    );
  }
}
