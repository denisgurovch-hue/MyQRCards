import Link from 'next/link';

export default function PublicCardNotFound() {
  return (
    <main className="public-shell">
      <section className="public-card">
        <h1>Визитка не найдена</h1>
        <p className="muted">
          Ссылка недействительна или визитка больше не опубликована.
        </p>
        <Link href="/">На главную</Link>
      </section>
    </main>
  );
}
