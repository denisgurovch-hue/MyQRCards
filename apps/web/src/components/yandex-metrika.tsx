import Script from 'next/script';

/** Public Yandex.Metrika counter id (not a secret). Landing page only. */
export const YANDEX_METRIKA_ID = 114719989;

/**
 * Page-scoped Metrika loader — mount only on the marketing home page so
 * /dashboard, /u/*, cabinet routes, etc. do not pull the tag on first load.
 */
export function YandexMetrika() {
  const id = YANDEX_METRIKA_ID;
  const tagSrc = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">{`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) { return; }
  }
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document, "script", ${JSON.stringify(tagSrc)}, "ym");
ym(${id}, "init", {
  ssr: true,
  webvisor: true,
  clickmap: true,
  ecommerce: "dataLayer",
  referrer: document.referrer,
  url: location.href,
  accurateTrackBounce: true,
  trackLinks: true
});
`}</Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Metrika noscript pixel */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
