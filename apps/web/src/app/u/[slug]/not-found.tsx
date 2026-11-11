import Link from 'next/link';

export default function PublicCardNotFound() {
  return (
    <main className="public-shell">
      <section className="public-card">
        <div className="public-photo-wrap" aria-hidden="true">
          <div className="public-photo-fallback">?</div>
        </div>
        <h1 className="public-name">Визитка не найдена</h1>
        <p className="public-summary muted">
          Ссылка недействительна или визитка больше не опубликована.
        </p>
        <div className="public-actions">
          <Link className="public-action" href="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}
