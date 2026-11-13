import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('public vCard download', () => {
  test('guest downloads .vcf from public page without auth cookies', async ({
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
        'Откроется файл контакта. Подтвердите добавление на устройстве.',
      ),
    ).toBeVisible();

    const saveButton = guestPage.getByRole('button', {
      name: 'Сохранить контакт',
    });
    const downloadPromise = guestPage.waitForEvent('download');
    await saveButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`contact-${slug}.vcf`);

    // Mobile WebKit used to leave the label blank until the next tap after
    // download; assert the idle label is visible again without further input.
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toContainText('Сохранить контакт');
    await expect(saveButton).not.toHaveAttribute('aria-busy', 'true');

    const api = await guestPage.request.get(
      `/api/v1/public/cards/${slug}/vcard`,
    );
    expect(api.ok()).toBeTruthy();
    expect(api.headers()['content-type'] ?? '').toMatch(/vcard/i);
    const body = await api.text();
    expect(body).toContain('BEGIN:VCARD');
    expect(body).toContain('FN:VCard Person');
    expect(body).toContain('card@example.com');
    expect(body).not.toContain(ownerEmail);

    await guest.close();
    await owner.close();
  });
});
