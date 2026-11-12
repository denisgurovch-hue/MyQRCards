import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function register(page: import('@playwright/test').Page, name: string, mail: string) {
  await page.goto('/register');
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('E-mail').fill(mail);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('present card (T-013)', () => {
  test('draft preview without QR; published shows in-card QR', async ({
    page,
  }) => {
    const ownerEmail = email('present-owner');
    const slug = `present-${Date.now().toString(36)}`;

    await register(page, 'Present Owner', ownerEmail);

    await page.goto('/cards/new');
    await page.getByLabel('Имя *').fill('Present Name');
    await page.getByLabel('Slug (необязательно)').fill(slug);
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/.+/edit`));
    const editUrl = page.url();
    const cardId = editUrl.match(/\/cards\/([^/]+)\/edit/)?.[1];
    expect(cardId).toBeTruthy();

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Показать визитку' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'QR-код' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Показать визитку' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/present`));
    await expect(page.getByRole('heading', { name: 'Present Name' })).toBeVisible();
    await expect(
      page.getByText(
        'Предпросмотр. Визитка не опубликована — QR-код и публичная ссылка недоступны',
      ),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: /QR-код визитки/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Скачать PNG' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Скачать SVG' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Копировать ссылку' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Открыть визитку' })).toHaveCount(0);

    await page.goto(`/cards/${cardId}/edit`);
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(page.getByText(/статус/i)).toContainText('published');

    await page.goto(`/cards/${cardId}/present`);
    await expect(page.getByRole('img', { name: /QR-код визитки/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: 'Скачать PNG' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Открыть визитку' })).toHaveCount(0);
    await expect(page.getByText(`http://127.0.0.1:3000/u/${slug}`)).toHaveCount(0);
  });

  test('foreign card present returns 404', async ({ page, browser }) => {
    const ownerEmail = email('present-a');
    const otherEmail = email('present-b');
    const slug = `foreign-${Date.now().toString(36)}`;

    await register(page, 'Owner A', ownerEmail);
    await page.goto('/cards/new');
    await page.getByLabel('Имя *').fill('Owner Card');
    await page.getByLabel('Slug (необязательно)').fill(slug);
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/.+/edit`));
    const cardId = page.url().match(/\/cards\/([^/]+)\/edit/)?.[1];
    expect(cardId).toBeTruthy();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await register(otherPage, 'Owner B', otherEmail);
    await otherPage.goto(`/cards/${cardId}/present`);
    await expect(otherPage.getByText(/404|not found|не найден/i)).toBeVisible();
    await otherContext.close();
  });

  test('unauthenticated present redirects to login', async ({ page }) => {
    await page.goto('/cards/00000000-0000-4000-8000-000000000001/present');
    await expect(page).toHaveURL(/\/login/);
  });
});
