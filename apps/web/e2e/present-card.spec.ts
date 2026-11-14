import { expect, test } from '@playwright/test';
import { createCardViaEditor } from './helpers/create-card';

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

    const cardId = await createCardViaEditor(page, {
      name: 'Present Name',
      slug,
    });

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

    await page.goto(`/cards/${cardId}/edit-v2`);
    await page.getByRole('button', { name: 'Управление' }).click();
    const manage = page.getByRole('dialog', { name: 'Управление визиткой' });
    await manage.getByRole('button', { name: 'Опубликовать' }).click();
    const publishConfirm = page.getByRole('dialog', {
      name: 'Опубликовать визитку?',
    });
    await publishConfirm.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(manage.getByText(/Статус сейчас:\s*published/i)).toBeVisible();

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
    const cardId = await createCardViaEditor(page, {
      name: 'Owner Card',
      slug,
    });

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
