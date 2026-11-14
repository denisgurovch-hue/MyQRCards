import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

/** Minimal 1×1 JPEG */
function tinyJpeg(): Buffer {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
    'base64',
  );
}

test.describe('card photo editor (T-015)', () => {
  test('shows compact add control and opens crop dialog after file pick', async ({
    page,
  }) => {
    const ownerEmail = email('photo-owner');
    await page.goto('/register');
    await page.getByLabel('Имя').fill('Owner');
    await page.getByLabel('E-mail').fill(ownerEmail);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/cards/new');
    await page.getByLabel('Имя *').fill('Photo Person');
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page).toHaveURL(/\/cards\/.+\/edit-v2/);

    await expect(
      page.getByRole('button', { name: 'Добавить фото' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Подогнать фото' }),
    ).toHaveCount(0);

    const fileInput = page.locator('input[type="file"][accept*="image/jpeg"]').first();
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: tinyJpeg(),
    });

    const cropDialog = page.getByRole('dialog', { name: 'Кадр фото' });
    await expect(cropDialog).toBeVisible();
    await expect(cropDialog.getByRole('button', { name: 'Применить' })).toBeVisible();
    await expect(cropDialog.getByRole('button', { name: 'Повернуть 90°' })).toBeVisible();
    await expect(
      cropDialog.getByRole('button', { name: 'Сброс', exact: true }),
    ).toBeVisible();
    await expect(cropDialog.getByRole('button', { name: 'Заменить фото' })).toBeVisible();
    await cropDialog.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(cropDialog).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Добавить фото' }),
    ).toBeVisible();
  });
});
