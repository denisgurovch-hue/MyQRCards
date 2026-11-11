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
    <main className="app-shell">
      <div className="workspace">
        <header className="workspace-top">
          <div>
            <p className="brand brand-mark">
              Sign<span>et</span>
            </p>
            <p className="lede">
              {me.user.displayName
                ? `Здравствуйте, ${me.user.displayName}`
                : 'Личный кабинет'}
            </p>
            {me.user.email ? <p className="muted">{me.user.email}</p> : null}
          </div>
          <div className="workspace-actions">
            <Link className="button accent" href="/cards/new">
              Создать визитку
            </Link>
            <LogoutButton />
          </div>
        </header>

        <h2 className="section-title">Мои визитки</h2>
        {!cards || cards.items.length === 0 ? (
          <p className="muted">Пока нет визиток. Создайте первую — это займёт минуту.</p>
        ) : (
          <ul className="card-list">
            {cards.items.map((card) => (
              <li key={card.id} className="card-item">
                <div className="card-item-top">
                  <strong>{card.displayName}</strong>
                  <span
                    className={
                      card.status === 'published'
                        ? 'status-pill is-published'
                        : 'status-pill'
                    }
                  >
                    {card.status}
                  </span>
                </div>
                <div className="muted">
                  /{card.slug}
                  {card.jobTitle ? ` · ${card.jobTitle}` : ''}
                  {card.companyName ? ` · ${card.companyName}` : ''}
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
      </div>
    </main>
  );
}
