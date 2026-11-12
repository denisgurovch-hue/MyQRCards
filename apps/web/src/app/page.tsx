import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-copy">
        <p className="brand brand-mark">
          Sign<span>et</span>
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
            <div className="phone-head">
              <Image
                className="phone-avatar phone-avatar-photo"
                src="/images/mock-card-portrait.jpg"
                alt=""
                width={72}
                height={72}
                priority
              />
              <div>
                <p className="phone-name">Мария Орлова</p>
                <p className="phone-meta">Product · Signet</p>
              </div>
            </div>
            <div className="phone-qr" role="img" aria-label="Пример QR-кода">
              <svg
                className="phone-qr-svg"
                viewBox="0 0 29 29"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="29" height="29" fill="#f5f8fb" />
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
            <ul className="phone-contacts">
              <li>
                <span className="phone-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7.2 3.8h2.4l1.2 3.2-1.5 1.1a12.4 12.4 0 0 0 5.6 5.6l1.1-1.5 3.2 1.2v2.4c0 .9-.7 1.7-1.6 1.8A14.8 14.8 0 0 1 3.4 5.4c.1-.9.9-1.6 1.8-1.6Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="phone-contact-value">+7 999 123-45-67</span>
              </li>
              <li>
                <span className="phone-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3.5"
                      y="5.5"
                      width="17"
                      height="13"
                      rx="2.2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="m4.5 7.5 7.5 5.2L19.5 7.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="phone-contact-value">maria@signet.app</span>
              </li>
              <li>
                <span className="phone-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20.4 4.2 3.7 10.7c-.9.3-.9 1.6.1 1.9l4.2 1.3 1.6 4.8c.3.9 1.5 1.1 2.1.4l2.4-2.8 4.4 3.2c.8.6 1.9.1 2.1-.9l2.2-12.2c.2-1.1-.9-1.9-1.9-1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m9.8 13.8 8.2-6.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="phone-contact-value">@maria_orlova</span>
              </li>
              <li>
                <span className="phone-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3.5"
                      y="3.5"
                      width="17"
                      height="17"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8.2 10.2v6.3M8.2 7.6v.2M11.4 16.5v-3.7c0-1.5.8-2.3 2-2.3s2 .9 2 2.3v3.7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="phone-contact-value">linkedin.com/in/orlova</span>
              </li>
            </ul>
            <span className="phone-chip">Сохранить контакт</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
