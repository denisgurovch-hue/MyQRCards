'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

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
    <button type="button" onClick={onLogout} disabled={pending}>
      {pending ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
