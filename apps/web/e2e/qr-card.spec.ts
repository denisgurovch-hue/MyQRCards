import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('cabinet QR', () => {
  test('draft hides QR; published opens dialog and downloads PNG/SVG', async ({
    page,
  }) => {
    const ownerEmail = email('qr-owner');
    const slug = `qr-${Date.now().toString(36)}`;

    await page.goto('/register');
    await page.getByLabel('Имя').fill('QR Owner');
    await page.getByLabel('E-mail').fill(ownerEmail);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/cards/new');
    await page.getByLabel('Имя *').fill('QR Name');
    await page.getByLabel('Slug (необязательно)').fill(slug);
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/.+/edit`));

    await page.goto('/dashboard');
    await expect(
      page.getByText(
        'Опубликуйте визитку, чтобы получить публичную ссылку и QR-код.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'QR-код' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Редактировать' }).click();
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(page.getByText(/статус/i)).toContainText('published');

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'QR-код' }).click();
    await expect(page.getByRole('heading', { name: /QR-код/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /QR-код визитки/ })).toBeVisible({
      timeout: 10_000,
    });

    const pngDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать PNG' }).click();
    const pngDownload = await pngDownloadPromise;
    expect(pngDownload.suggestedFilename()).toBe(`qrcard-${slug}.png`);

    const svgDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать SVG' }).click();
    const svgDownload = await svgDownloadPromise;
    expect(svgDownload.suggestedFilename()).toBe(`qrcard-${slug}.svg`);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /QR-код/ })).toHaveCount(0);
  });
});
