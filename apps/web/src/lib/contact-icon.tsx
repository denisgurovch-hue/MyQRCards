export type ContactIconKind =
  | 'phone'
  | 'email'
  | 'website'
  | 'telegram'
  | 'whatsapp'
  | 'max'
  | 'vk'
  | 'linkedin'
  | 'youtube'
  | 'github'
  | 'tenchat'
  | 'dzen'
  | 'rutube'
  | 'behance'
  | 'instagram'
  | 'link';

type Props = {
  kind: ContactIconKind;
};

function hostOf(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function hostMatches(host: string, suffixes: string[]): boolean {
  return suffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function ContactIcon({ kind }: Props) {
  if (kind === 'phone') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7.2 3.8h2.4l1.2 3.2-1.5 1.1a12.4 12.4 0 0 0 5.6 5.6l1.1-1.5 3.2 1.2v2.4c0 .9-.7 1.7-1.6 1.8A14.8 14.8 0 0 1 3.4 5.4c.1-.9.9-1.6 1.8-1.6Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'email') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="2.2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="m4.5 7.5 7.5 5.2L19.5 7.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'telegram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20.4 4.2 3.7 10.7c-.9.3-.9 1.6.1 1.9l4.2 1.3 1.6 4.8c.3.9 1.5 1.1 2.1.4l2.4-2.8 4.4 3.2c.8.6 1.9.1 2.1-.9l2.2-12.2c.2-1.1-.9-1.9-1.9-1.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m9.8 13.8 8.2-6.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.6A8.4 8.4 0 0 0 5.1 16.3L4 20l3.8-1a8.4 8.4 0 1 0 4.2-15.4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9.2 9.4c.3-.3.7-.4 1-.2l1 .5c.3.1.4.5.3.8l-.3.8c1.2 2 2.7 3.1 4.4 3.8l.8-.4c.3-.2.7-.1.9.2l.6 1c.2.3.1.7-.2 1-.7.6-1.7.9-2.8.5-2.6-.8-4.9-2.9-6.5-5.8-.7-1.3-.6-2.5.1-3.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'max') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M7.2 15.2V8.8l2.6 4.2 2.6-4.2v6.4M14.8 15.2V8.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'vk') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M7.2 9.2h1.5c.2 2.2 1.1 3.5 2.6 3.9V9.2h1.5v2.6c.7-.1 1.4-.8 1.7-2.6h1.5c-.3 1.5-1.1 2.6-2.1 3.2 1 .5 2.1 1.6 2.6 3.4h-1.7c-.4-1.3-1.2-2.1-2.3-2.3v2.3H12.8V13c-1.6-.1-2.7-1.2-3.1-3.8H7.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (kind === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8.2 10.2v6.3M8.2 7.6v.2M11.4 16.5v-3.7c0-1.5.8-2.3 2-2.3s2 .9 2 2.3v3.7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.2"
          y="6.2"
          width="17.6"
          height="11.6"
          rx="3.2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="m11 9.8 4.2 2.2L11 14.2V9.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (kind === 'github') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c-4.6 0-8.3 3.7-8.3 8.3 0 3.7 2.4 6.8 5.7 7.9.4.1.6-.2.6-.4v-1.5c-2.3.5-2.8-1.1-2.8-1.1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.9-.2-3.8-0.9-3.8-4.1 0-.9.3-1.6.8-2.2-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.3.8a8 8 0 0 1 4.2 0c1.6-1 2.3-.8 2.3-.8.5 1.1.2 2 .1 2.2.5.6.8 1.3.8 2.2 0 3.2-2 3.9-3.9 4.1.3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4 3.3-1.1 5.7-4.2 5.7-7.9 0-4.6-3.7-8.3-8.3-8.3Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'tenchat') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v6.2a2.5 2.5 0 0 1-2.5 2.5H12l-3.8 3.2v-3.2H6.5A2.5 2.5 0 0 1 4 14.2V8a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 10.2h7.6M8.2 13h4.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === 'dzen') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'rutube') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8.2 9.2h3.1c1.6 0 2.6.9 2.6 2.3s-1 2.3-2.6 2.3H9.6V16M8.2 9.2V16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.6 16v-4.2c0-1.5.8-2.6 2.2-2.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === 'behance') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5.5 8.2h4.2c1.4 0 2.3.7 2.3 1.9 0 .8-.4 1.4-1.1 1.7 1 .3 1.6 1.1 1.6 2.1 0 1.4-1.1 2.3-2.8 2.3H5.5V8.2Zm2.2 3h1.6c.6 0 1-.3 1-.8s-.4-.8-1-.8H7.7v1.6Zm0 3.4h1.9c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1H7.7v2Z"
          fill="currentColor"
        />
        <path
          d="M13.2 13.6h5.3c0 1.5-1.1 2.7-2.7 2.7-1.7 0-2.8-1.2-2.8-2.9 0-1.8 1.2-3 2.9-3 1.4 0 2.4.8 2.6 2H16c-.2-.5-.6-.8-1.2-.8-.9 0-1.5.7-1.5 1.7 0 1 .6 1.7 1.6 1.7.7 0 1.2-.3 1.4-.8h-1.9v-1.3ZM14.5 8.5h4.2V9.8h-4.2V8.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16.6" cy="7.4" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'website') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M4.2 12h15.6M12 3.8c2.2 2.4 3.4 5.2 3.4 8.2S14.2 17.8 12 20.2C9.8 17.8 8.6 15 8.6 12S9.8 6.2 12 3.8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 14a4.5 4.5 0 0 0 6.4.4l2.2-2.2a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14 10a4.5 4.5 0 0 0-6.4-.4L5.4 11.8a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function resolveContactKind(input: {
  key?: string;
  type?: string | null;
  url?: string | null;
  channel?: string | null;
}): ContactIconKind {
  const key = (input.key ?? '').toLowerCase();
  const type = (input.type ?? '').toLowerCase();
  const url = (input.url ?? '').toLowerCase();
  const channel = (input.channel ?? '').toLowerCase();
  const host = hostOf(input.url ?? '');
  const raw = `${key} ${type} ${url} ${channel}`;

  // Telegram before phone: "telegram" / "t.me" must win over "tel" substring.
  if (
    channel === 'telegram' ||
    type === 'telegram' ||
    key.includes('telegram') ||
    hostMatches(host, ['t.me', 'telegram.org', 'telegram.me']) ||
    url.includes('t.me/') ||
    url.includes('telegram.')
  ) {
    return 'telegram';
  }
  if (
    channel === 'whatsapp' ||
    type === 'whatsapp' ||
    key.includes('whatsapp') ||
    hostMatches(host, ['wa.me', 'whatsapp.com', 'api.whatsapp.com']) ||
    url.includes('wa.me/') ||
    url.includes('whatsapp.')
  ) {
    return 'whatsapp';
  }
  if (
    channel === 'max' ||
    type === 'max' ||
    key === 'max' ||
    hostMatches(host, ['max.ru', 'web.max.ru'])
  ) {
    return 'max';
  }
  if (
    channel === 'vk' ||
    type === 'vk' ||
    key === 'vk' ||
    hostMatches(host, ['vk.com', 'vk.ru', 'vk.me', 'm.vk.com']) ||
    raw.includes('vk.com') ||
    raw.includes('vk.me')
  ) {
    return 'vk';
  }
  if (
    type === 'linkedin' ||
    channel === 'linkedin' ||
    hostMatches(host, ['linkedin.com', 'lnkd.in']) ||
    raw.includes('linkedin')
  ) {
    return 'linkedin';
  }
  if (
    type === 'youtube' ||
    hostMatches(host, ['youtube.com', 'youtu.be', 'm.youtube.com']) ||
    raw.includes('youtube') ||
    raw.includes('youtu.be')
  ) {
    return 'youtube';
  }
  if (
    type === 'github' ||
    hostMatches(host, ['github.com', 'gist.github.com']) ||
    raw.includes('github.com')
  ) {
    return 'github';
  }
  if (
    type === 'tenchat' ||
    hostMatches(host, ['tenchat.ru']) ||
    raw.includes('tenchat')
  ) {
    return 'tenchat';
  }
  if (
    type === 'dzen' ||
    type === 'zen' ||
    hostMatches(host, ['dzen.ru', 'zen.yandex.ru']) ||
    raw.includes('dzen.ru') ||
    raw.includes('zen.yandex')
  ) {
    return 'dzen';
  }
  if (
    type === 'rutube' ||
    hostMatches(host, ['rutube.ru']) ||
    raw.includes('rutube')
  ) {
    return 'rutube';
  }
  if (
    type === 'behance' ||
    hostMatches(host, ['behance.net']) ||
    raw.includes('behance')
  ) {
    return 'behance';
  }
  if (
    type === 'instagram' ||
    hostMatches(host, ['instagram.com', 'instagr.am']) ||
    raw.includes('instagram') ||
    raw.includes('instagr.am')
  ) {
    return 'instagram';
  }
  if (
    key === 'phone' ||
    channel === 'phone' ||
    type === 'phone' ||
    url.startsWith('tel:')
  ) {
    return 'phone';
  }
  if (
    key === 'email' ||
    channel === 'email' ||
    type === 'email' ||
    url.startsWith('mailto:')
  ) {
    return 'email';
  }
  if (key === 'website' || channel === 'website' || type === 'website') {
    return 'website';
  }
  if (url.startsWith('http') || host) {
    return 'website';
  }
  return 'link';
}
