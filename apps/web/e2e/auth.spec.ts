import { expect, test } from '@playwright/test';

const password = 'StrongPassphrase123!';

function email() {
  return `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('auth pages', () => {
  test('register → dashboard → logout → login', async ({ page }) => {
    const userEmail = email();

    await page.goto('/register');
    await expect(page.getByText('MyQRCards').first()).toBeVisible();
    await page.getByLabel('Имя').fill('E2E User');
    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Личный кабинет')).toBeVisible();

    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Пароль').fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login page shows VK ID entry point', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('link', { name: 'Войти через VK ID' }),
    ).toHaveAttribute('href', '/api/v1/auth/vkid/authorize');
  });
});
