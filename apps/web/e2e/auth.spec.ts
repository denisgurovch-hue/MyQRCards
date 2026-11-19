import { expect, test } from '@playwright/test';
import { registerUser, E2E_PASSWORD } from './helpers/register';

function email() {
  return `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('auth pages', () => {
  test('register → dashboard → logout → login', async ({ page }) => {
    const userEmail = email();

    await registerUser(page, {
      email: userEmail,
      lastName: 'E2E',
      firstName: 'User',
    });

    await expect(page.getByText('Здравствуйте, E2E User')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Мои визитки' })).toBeVisible();

    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Пароль').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login page shows VK ID and Yandex ID entry points', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('link', { name: 'Войти через VK ID' }),
    ).toHaveAttribute('href', '/api/v1/auth/vkid/authorize');
    await expect(
      page.getByRole('link', { name: 'Войти через Яндекс ID' }),
    ).toHaveAttribute('href', '/api/v1/auth/yandex/authorize');
  });
});
