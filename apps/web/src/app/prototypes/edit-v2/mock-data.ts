export type PrototypeLink = {
  id: string;
  label: string;
  url: string;
  type: 'telegram' | 'whatsapp' | 'link';
};

/** Slot keys or link id — visual order of contact rows in the editor. */
export type ContactOrderKey = 'phone' | 'email' | 'website' | (string & {});

export type PrototypeDraft = {
  displayName: string;
  jobTitle: string;
  companyName: string;
  summary: string;
  phone: string;
  email: string;
  showEmail: boolean;
  websiteUrl: string;
  links: PrototypeLink[];
  /** Drag-and-drop order of contact rows (slots + link ids). */
  contactOrder: ContactOrderKey[];
  photoUrl: string | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  slug: string;
  status: 'draft' | 'published' | 'archived';
};

export function defaultContactOrder(
  links: PrototypeLink[] = [],
): ContactOrderKey[] {
  return ['phone', 'email', 'website', ...links.map((link) => link.id)];
}

export function normalizeContactOrder(
  order: ContactOrderKey[] | undefined,
  links: PrototypeLink[],
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

export type PrototypeScenario =
  | 'full'
  | 'empty'
  | 'edit-profile'
  | 'edit-contact'
  | 'add-contact'
  | 'edit-cover'
  | 'edit-photo'
  | 'dirty'
  | 'saving'
  | 'save-error'
  | 'cancel-confirm'
  | 'card-actions';

export const SCENARIO_LABELS: Record<PrototypeScenario, string> = {
  full: '1. Полная карточка',
  empty: '2. Без фото и опциональных полей',
  'edit-profile': '3. Редактирование основной информации',
  'edit-contact': '4. Редактирование контакта',
  'add-contact': '5. Добавление контакта',
  'edit-photo': '6a. Выбор фото',
  'edit-cover': '6b. Выбор фона',
  dirty: '7. Несохранённые изменения',
  saving: '8. Сохранение',
  'save-error': '9. Ошибка сохранения',
  'cancel-confirm': '10. Подтверждение отмены',
  'card-actions': '11. Управление визиткой',
};

/** Mock avatar — abstract teal gradient, no external network. */
export const MOCK_PHOTO_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0e9aa7"/>
          <stop offset="100%" stop-color="#1a2b3d"/>
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#g)"/>
      <circle cx="160" cy="128" r="54" fill="#fff" opacity="0.92"/>
      <ellipse cx="160" cy="262" rx="92" ry="70" fill="#fff" opacity="0.92"/>
    </svg>`,
  );

export const MOCK_COVER_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="340" viewBox="0 0 800 340">
      <defs>
        <linearGradient id="c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1520"/>
          <stop offset="55%" stop-color="#0e9aa7"/>
          <stop offset="100%" stop-color="#ff6b3d"/>
        </linearGradient>
      </defs>
      <rect width="800" height="340" fill="url(#c)"/>
      <circle cx="640" cy="90" r="70" fill="#fff" opacity="0.12"/>
      <circle cx="120" cy="220" r="110" fill="#fff" opacity="0.08"/>
    </svg>`,
  );

export function createFullDraft(): PrototypeDraft {
  return {
    displayName: 'Денис Гуров',
    jobTitle: 'Product Engineer',
    companyName: 'Signet',
    summary: 'Цифровые визитки с QR, vCard и базовой аналитикой.',
    phone: '+7 999 000-11-22',
    email: 'denis@example.com',
    showEmail: false,
    websiteUrl: 'https://signet.example',
    links: [
      {
        id: 'link-tg',
        label: 'Telegram',
        url: 'https://t.me/example',
        type: 'telegram',
      },
      {
        id: 'link-site-extra',
        label: 'LinkedIn',
        url: 'https://linkedin.com/in/example',
        type: 'link',
      },
    ],
    contactOrder: defaultContactOrder([
      {
        id: 'link-tg',
        label: 'Telegram',
        url: 'https://t.me/example',
        type: 'telegram',
      },
      {
        id: 'link-site-extra',
        label: 'LinkedIn',
        url: 'https://linkedin.com/in/example',
        type: 'link',
      },
    ]),
    photoUrl: MOCK_PHOTO_DATA_URL,
    coverColor: null,
    coverImageUrl: MOCK_COVER_DATA_URL,
    slug: 'denis-gurov',
    status: 'published',
  };
}

export function createEmptyDraft(): PrototypeDraft {
  return {
    displayName: 'Новая визитка',
    jobTitle: '',
    companyName: '',
    summary: '',
    phone: '',
    email: '',
    showEmail: false,
    websiteUrl: '',
    links: [],
    contactOrder: defaultContactOrder([]),
    photoUrl: null,
    coverColor: '#0B1520',
    coverImageUrl: null,
    slug: 'new-card-demo',
    status: 'draft',
  };
}

export function cloneDraft(draft: PrototypeDraft): PrototypeDraft {
  return {
    ...draft,
    links: draft.links.map((link) => ({ ...link })),
    contactOrder: [...draft.contactOrder],
  };
}
