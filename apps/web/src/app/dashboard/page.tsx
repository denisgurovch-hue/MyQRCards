import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardAnalytics } from './card-analytics';
import { LogoutButton } from './logout-button';
import { PublicLinkActions } from './public-link-actions';
import { QrActions } from './qr-actions';
import { serverApiFetch } from '../../lib/server-api';

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
};

type CardsResponse = {
  items: Array<{
    id: string;
    displayName: string;
    slug: string;
    status: string;
    jobTitle: string | null;
    companyName: string | null;
  }>;
  total: number;
};

export default async function DashboardPage() {
  const me = await serverApiFetch<MeResponse>('/api/v1/auth/me');
  if (!me) {
    redirect('/login');
  }

  const cards = await serverApiFetch<CardsResponse>(
    '/api/v1/cards?page=1&limit=50',
  );

  return (
    <main className="auth-shell">
      <section className="panel" style={{ width: 'min(640px, 100%)' }}>
        <p className="brand">MyQRCards</p>
        <p className="lede">Личный кабинет</p>
        <p>
          {me.user.displayName
            ? `Здравствуйте, ${me.user.displayName}`
            : 'Вы вошли в аккаунт'}
        </p>
        {me.user.email ? <p className="muted">{me.user.email}</p> : null}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <Link className="button" href="/cards/new">
            Создать визитку
          </Link>
          <LogoutButton />
        </div>

        <h2 style={{ marginTop: '1.75rem', fontFamily: 'var(--font)' }}>
          Мои визитки
        </h2>
        {!cards || cards.items.length === 0 ? (
          <p className="muted">Пока нет визиток. Создайте первую.</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {cards.items.map((card) => (
              <li
                key={card.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '0.9rem 1rem',
                  background: '#fff',
                }}
              >
                <strong>{card.displayName}</strong>
                <div className="muted">
                  /{card.slug} · {card.status}
                  {card.jobTitle ? ` · ${card.jobTitle}` : ''}
                </div>
                <div className="card-row-actions">
                  <Link href={`/cards/${card.id}/edit`}>Редактировать</Link>
                  <QrActions
                    slug={card.slug}
                    status={card.status}
                    displayName={card.displayName}
                  />
                </div>
                <PublicLinkActions slug={card.slug} status={card.status} />
                <CardAnalytics cardId={card.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
