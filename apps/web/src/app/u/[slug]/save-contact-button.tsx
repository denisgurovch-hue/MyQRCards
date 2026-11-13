type Props = {
  slug: string;
};

function vcardHref(slug: string, download = false): string {
  const path = `/api/v1/public/cards/${encodeURIComponent(slug)}/vcard`;
  return download ? `${path}?download=1` : path;
}

/** Primary save uses same-document navigation to the inline vCard endpoint. */
export function SaveContactButton({ slug }: Props) {
  const openHref = vcardHref(slug);
  const downloadHref = vcardHref(slug, true);

  return (
    <div className="public-vcard">
      <a className="public-action public-action-secondary" href={openHref}>
        Сохранить контакт
      </a>
      <p className="muted public-vcard-hint">
        Откроется файл контакта. Подтвердите добавление на устройстве.
      </p>
      <p className="muted public-vcard-hint">
        Если файл скачался, откройте его из загрузок браузера и выберите
        добавление или импорт контакта.
      </p>
      <a className="public-vcard-download" href={downloadHref}>
        Скачать .vcf
      </a>
    </div>
  );
}
