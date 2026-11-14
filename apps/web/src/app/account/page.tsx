import { redirect } from 'next/navigation';
import { serverApiFetch } from '../../lib/server-api';
import { AccountSettings, type AccountUser } from './account-settings';

type MeResponse = {
  user: AccountUser;
};

export default async function AccountPage() {
  const me = await serverApiFetch<MeResponse>('/api/v1/auth/me');
  if (!me) {
    redirect('/login');
  }

  return (
    <AccountSettings
      user={{
        id: me.user.id,
        email: me.user.email,
        displayName: me.user.displayName,
        hasPassword: Boolean(me.user.hasPassword),
      }}
    />
  );
}
