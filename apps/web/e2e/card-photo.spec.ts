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
    await expect(page).toHaveURL(/\/cards\/.+\/edit/);

    await expect(page.getByRole('button', { name: 'Добавить фото' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Изменить фото' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Подогнать' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Загрузить фото' })).toHaveCount(0);

    const photoRegion = page.getByRole('region', { name: 'Фото' });
    const fileInput = photoRegion.locator('input[type="file"][accept*="image/jpeg"]');
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: tinyJpeg(),
    });

    await expect(page.getByRole('heading', { name: 'Кадр фото' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Сохранить фото' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повернуть 90°' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Сброс' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Заменить фото' })).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByRole('heading', { name: 'Кадр фото' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Добавить фото' })).toBeVisible();
  });
});
