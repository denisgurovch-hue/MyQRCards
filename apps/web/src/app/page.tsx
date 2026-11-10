import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="auth-shell">
      <section className="panel">
        <p className="brand">MyQRCards</p>
        <p className="lede">Цифровые визитки с QR-кодом и vCard.</p>
        <div className="stack">
          <Link className="button" href="/register">
            Создать аккаунт
          </Link>
          <Link className="button secondary" href="/login">
            Войти
          </Link>
        </div>
      </section>
    </main>
  );
}
