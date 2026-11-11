import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-copy">
        <p className="brand brand-mark">
          MyQR<span>Cards</span>
        </p>
        <h1 className="landing-headline">Визитка, которая открывается с телефона</h1>
        <p className="landing-support">
          Одна ссылка, QR и контакт в записной книжке — без приложений и бумаг.
        </p>
        <div className="landing-cta">
          <Link className="button accent" href="/register">
            Создать визитку
          </Link>
          <Link className="button secondary" href="/login">
            Войти
          </Link>
        </div>
      </section>

      <aside className="landing-visual" aria-hidden="true">
        <div className="phone-stage">
          <div className="phone-screen">
            <div className="phone-avatar">М</div>
            <div>
              <p className="phone-name">Мария Орлова</p>
              <p className="phone-meta">Product · SmartVizitka</p>
            </div>
            <div className="phone-qr" />
            <span className="phone-chip">Сохранить контакт</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
