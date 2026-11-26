import { getPublicAppUrl } from '../lib/public-url';

/** Static Organization + WebSite structured data for the marketing home page. */
export function LandingJsonLd() {
  const url = getPublicAppUrl();
  const graph = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Signet',
      url,
      description: 'Цифровые визитки с QR-кодом и vCard',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Signet',
      url,
      inLanguage: 'ru-RU',
      description:
        'Одна ссылка, QR и контакт в записной книжке — без приложений и бумаг.',
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Controlled static payload — not user content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
