import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CabinetChrome } from '../../components/cabinet-chrome';
import { serverApiFetch } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    isAdmin?: boolean;
  };
};

type AdminMetrics = {
  period: '7' | '30' | 'all';
  usersTotal: number;
  usersNew: number;
  cardsTotal: number;
  cardsNew: number;
  cardsByStatus: {
    draft: number;
    published: number;
    archived: number;
  };
  cardsPublishedNow: number;
  eventsViews: number;
  eventsClicks: number;
  eventsVcard: number;
  authProviders: {
    password: number;
    vkid: number;
    yandex: number;
    other: number;
  };
};

const PERIODS = [
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
  { id: 'all', label: 'Всё время' },
] as const;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-metric">
      <div className="card-analytics-metric-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const me = await serverApiFetch<MeResponse>('/api/v1/auth/me');
  if (!me) {
    redirect('/login');
  }
  if (!me.user.isAdmin) {
    redirect('/dashboard');
  }

  const params = (await searchParams) ?? {};
  const period =
    params.period === '7' || params.period === '30' || params.period === 'all'
      ? params.period
      : 'all';

  const metrics = await serverApiFetch<AdminMetrics>(
    `/api/v1/admin/metrics?period=${period}`,
  );

  return (
    <main className="app-shell">
      <div className="workspace">
        <CabinetChrome
          context="admin"
          isAdmin
          title={
            <>
              <h1 className="section-title">Админ-панель</h1>
              <p className="muted">Платформенные метрики MyQRCards</p>
            </>
          }
        />

        <div className="card-analytics-periods" role="tablist" aria-label="Период">
          {PERIODS.map((item) => (
            <Link
              key={item.id}
              href={`/admin?period=${item.id}`}
              className={
                item.id === period
                  ? 'card-analytics-period is-active'
                  : 'card-analytics-period'
              }
            >
              {item.label}
            </Link>
          ))}
        </div>

        {!metrics ? (
          <p className="error">Не удалось загрузить метрики.</p>
        ) : (
          <div className="admin-metrics stack">
            <section className="admin-metrics-section">
              <h2 className="section-title">Пользователи</h2>
              <div className="admin-metrics-grid">
                <Metric label="Всего" value={metrics.usersTotal} />
                <Metric label="Новые за период" value={metrics.usersNew} />
              </div>
            </section>

            <section className="admin-metrics-section">
              <h2 className="section-title">Визитки</h2>
              <div className="admin-metrics-grid">
                <Metric label="Всего (без удалённых)" value={metrics.cardsTotal} />
                <Metric label="Новые за период" value={metrics.cardsNew} />
                <Metric label="Сейчас published" value={metrics.cardsPublishedNow} />
                <Metric label="Draft" value={metrics.cardsByStatus.draft} />
                <Metric label="Archived" value={metrics.cardsByStatus.archived} />
              </div>
            </section>

            <section className="admin-metrics-section">
              <h2 className="section-title">События</h2>
              <div className="admin-metrics-grid">
                <Metric label="Просмотры" value={metrics.eventsViews} />
                <Metric label="Клики" value={metrics.eventsClicks} />
                <Metric label="Скачивания vCard" value={metrics.eventsVcard} />
              </div>
            </section>

            <section className="admin-metrics-section">
              <h2 className="section-title">Вход</h2>
              <div className="admin-metrics-grid">
                <Metric label="С паролем" value={metrics.authProviders.password} />
                <Metric label="VK ID" value={metrics.authProviders.vkid} />
                <Metric label="Яндекс ID" value={metrics.authProviders.yandex} />
                <Metric label="Прочие IdP" value={metrics.authProviders.other} />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
