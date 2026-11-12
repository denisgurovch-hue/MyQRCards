export type ContactIconKind =
  | 'phone'
  | 'email'
  | 'website'
  | 'telegram'
  | 'linkedin'
  | 'link';

type Props = {
  kind: ContactIconKind;
};

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
  const raw =
    `${input.key ?? ''} ${input.type ?? ''} ${input.url ?? ''} ${input.channel ?? ''}`.toLowerCase();
  if (
    input.key === 'phone' ||
    input.channel === 'phone' ||
    raw.includes('phone') ||
    raw.includes('tel')
  ) {
    return 'phone';
  }
  if (
    input.key === 'email' ||
    input.channel === 'email' ||
    raw.includes('mail')
  ) {
    return 'email';
  }
  if (raw.includes('t.me') || raw.includes('telegram') || input.channel === 'telegram') {
    return 'telegram';
  }
  if (raw.includes('linkedin')) {
    return 'linkedin';
  }
  if (
    input.key === 'website' ||
    input.channel === 'website' ||
    raw.includes('http')
  ) {
    return 'website';
  }
  return 'link';
}
