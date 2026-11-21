'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

function LogoutDoorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 12h9.5m0 0-2.6-2.6M19.5 12l-2.6 2.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const label = pending ? 'Выходим…' : 'Выйти';

  async function onLogout() {
    setPending(true);
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="secondary logout-icon-button"
      onClick={onLogout}
      disabled={pending}
      aria-label={label}
      title={label}
      aria-busy={pending}
    >
      <LogoutDoorIcon />
    </button>
  );
}
