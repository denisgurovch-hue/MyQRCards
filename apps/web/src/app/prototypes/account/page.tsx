import { Suspense } from 'react';
import { AccountPrototype } from './account-prototype';

export const dynamic = 'force-dynamic';

export default function AccountPrototypePage() {
  return (
    <Suspense fallback={<main className="app-shell">Загрузка…</main>}>
      <AccountPrototype />
    </Suspense>
  );
}
