import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('public vCard download', () => {
  test('guest opens inline vCard link and can fallback to attachment', async ({
    browser,
  }) => {
    const owner = await browser.newContext();
    const ownerPage = await owner.newPage();
    const ownerEmail = email('vcard-owner');
    const slug = `vcf-${Date.now().toString(36)}`;

    await ownerPage.goto('/register');
    await ownerPage.getByLabel('Имя').fill('Owner');
    await ownerPage.getByLabel('E-mail').fill(ownerEmail);
    await ownerPage.getByLabel('Пароль').fill(password);
    await ownerPage.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(ownerPage).toHaveURL(/\/dashboard/);

    await ownerPage.goto('/cards/new');
    await ownerPage.getByLabel('Имя *').fill('VCard Person');
    await ownerPage.getByLabel('Slug (необязательно)').fill(slug);
    await ownerPage.getByLabel('Телефон').fill('+79991112233');
    await ownerPage.getByLabel('E-mail на карточке').fill('card@example.com');
    await ownerPage.getByLabel('Показывать e-mail публично').check();
    await ownerPage.getByRole('button', { name: 'Создать' }).click();
    await expect(ownerPage).toHaveURL(new RegExp(`/cards/.+/edit`));
    await ownerPage.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(ownerPage.getByText('статус')).toContainText('published');

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/u/${slug}`);
    await expect(
      guestPage.getByRole('heading', { name: 'VCard Person' }),
    ).toBeVisible();
    await expect(
      guestPage.getByText(
        'Если файл скачался, откройте его из загрузок браузера',
      ),
    ).toBeVisible();

    const saveLink = guestPage.getByRole('link', {
      name: 'Сохранить контакт',
    });
    await expect(saveLink).toHaveAttribute(
      'href',
      `/api/v1/public/cards/${slug}/vcard`,
    );
    await expect(saveLink).not.toHaveAttribute('download', /.*/);

    const downloadLink = guestPage.getByRole('link', { name: 'Скачать .vcf' });
    await expect(downloadLink).toHaveAttribute(
      'href',
      `/api/v1/public/cards/${slug}/vcard?download=1`,
    );
    await expect(downloadLink).not.toHaveAttribute('download', /.*/);

    const inline = await guestPage.request.get(
      `/api/v1/public/cards/${slug}/vcard`,
    );
    expect(inline.ok()).toBeTruthy();
    expect(inline.headers()['content-type'] ?? '').toMatch(/vcard/i);
    expect(inline.headers()['content-disposition'] ?? '').toMatch(/^inline;/i);
    const inlineBody = await inline.text();
    expect(inlineBody).toContain('BEGIN:VCARD');
    expect(inlineBody).toContain('FN:VCard Person');
    expect(inlineBody).toContain('card@example.com');
    expect(inlineBody).not.toContain(ownerEmail);

    const attachment = await guestPage.request.get(
      `/api/v1/public/cards/${slug}/vcard?download=1`,
    );
    expect(attachment.ok()).toBeTruthy();
    expect(attachment.headers()['content-disposition'] ?? '').toMatch(
      /^attachment;/i,
    );
    expect(await attachment.text()).toBe(inlineBody);

    const downloadPromise = guestPage.waitForEvent('download');
    await downloadLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`contact-${slug}.vcf`);

    await guest.close();
    await owner.close();
  });
});
