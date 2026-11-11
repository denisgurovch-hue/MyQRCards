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
            <div className="phone-qr" role="img" aria-label="Пример QR-кода">
              <svg
                className="phone-qr-svg"
                viewBox="0 0 29 29"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="29" height="29" fill="#f5f8fb" />
                {/* finder patterns */}
                <path
                  fill="#0b1520"
                  d="M1 1h7v7H1zm2 2h3v3H3zM21 1h7v7h-7zm2 2h3v3h-3zM1 21h7v7H1zm2 2h3v3H3z"
                />
                <path
                  fill="#0b1520"
                  d="M10 1h2v2h-2zm4 0h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-6 2h2v2h-2zm4 0h2v2h-2zm4 0h1v2h-1zM10 7h3v2h-3zm5 0h2v2h-2zm-1 2h2v2h-2zm4 0h2v2h-2zM1 10h2v2H1zm4 0h2v2H5zm4 0h2v2H9zm6 0h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2zM3 12h2v2H3zm4 0h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm6 0h2v2h-2zm-2 2h2v2h-2zm4 0h1v2h-1zM1 14h1v2H1zm3 0h2v2H4zm4 0h2v2H8zm4 0h3v2h-3zm5 0h2v2h-2zm4 0h2v2h-2zM2 16h2v2H2zm4 0h2v2H6zm6 0h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2zM1 18h2v2H1zm4 0h3v2H5zm5 0h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2zM10 20h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2zm-6 2h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2zm-6 2h3v2h-3zm5 0h2v2h-2zm4 0h1v2h-1z"
                />
              </svg>
            </div>
            <span className="phone-chip">Сохранить контакт</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
