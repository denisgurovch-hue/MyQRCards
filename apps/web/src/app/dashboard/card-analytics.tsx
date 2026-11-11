'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Period = '7d' | '30d';

type AnalyticsResponse = {
  period: Period;
  totals: {
    card_views: number;
    contact_clicks: number;
    vcard_downloads: number;
  };
  by_channel: {
    phone: number;
    email: number;
    whatsapp: number;
    telegram: number;
    link: number;
  };
  daily: Array<{
    date: string;
    card_views: number;
    contact_clicks: number;
    vcard_downloads: number;
  }>;
};

type Props = {
  cardId: string;
};

const CHANNEL_LABELS: Record<keyof AnalyticsResponse['by_channel'], string> = {
  phone: 'Телефон',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  link: 'Ссылки',
};

export function CardAnalytics({ cardId }: Props) {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiFetch<AnalyticsResponse>(
      `/api/v1/cards/${encodeURIComponent(cardId)}/analytics?period=${period}`,
    )
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error
              ? err.message
              : 'Не удалось загрузить аналитику',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, period]);

  const empty =
    data &&
    data.totals.card_views === 0 &&
    data.totals.contact_clicks === 0 &&
    data.totals.vcard_downloads === 0;

  return (
    <div className="card-analytics">
      <div className="card-analytics-header">
        <h3 className="card-analytics-title">Аналитика</h3>
        <div className="card-analytics-periods" role="group" aria-label="Период">
          <button
            type="button"
            className={
              period === '7d'
                ? 'card-analytics-period is-active'
                : 'card-analytics-period'
            }
            onClick={() => setPeriod('7d')}
          >
            7 дней
          </button>
          <button
            type="button"
            className={
              period === '30d'
                ? 'card-analytics-period is-active'
                : 'card-analytics-period'
            }
            onClick={() => setPeriod('30d')}
          >
            30 дней
          </button>
        </div>
      </div>

      {loading ? <p className="muted">Загрузка аналитики…</p> : null}

      {!loading && error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && empty ? (
        <p className="muted">Пока нет данных за выбранный период</p>
      ) : null}

      {!loading && !error && data && !empty ? (
        <>
          <div className="card-analytics-metrics">
            <div>
              <div className="card-analytics-metric-value">
                {data.totals.card_views}
              </div>
              <div className="muted">Просмотры</div>
            </div>
            <div>
              <div className="card-analytics-metric-value">
                {data.totals.contact_clicks}
              </div>
              <div className="muted">Клики</div>
            </div>
            <div>
              <div className="card-analytics-metric-value">
                {data.totals.vcard_downloads}
              </div>
              <div className="muted">Скачивания vCard</div>
            </div>
          </div>

          <h4 className="card-analytics-subtitle">По каналам</h4>
          <ul className="card-analytics-channels">
            {(
              Object.keys(CHANNEL_LABELS) as Array<
                keyof AnalyticsResponse['by_channel']
              >
            ).map((key) => (
              <li key={key}>
                <span>{CHANNEL_LABELS[key]}</span>
                <strong>{data.by_channel[key]}</strong>
              </li>
            ))}
          </ul>

          <h4 className="card-analytics-subtitle">По дням</h4>
          <div className="card-analytics-table-wrap">
            <table className="card-analytics-table">
              <thead>
                <tr>
                  <th scope="col">Дата</th>
                  <th scope="col">Просмотры</th>
                  <th scope="col">Клики</th>
                  <th scope="col">vCard</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.card_views}</td>
                    <td>{row.contact_clicks}</td>
                    <td>{row.vcard_downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
