import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const E2E_PASSWORD = 'StrongPassphrase123!';

export type RegisterInput = {
  email: string;
  lastName?: string;
  firstName?: string;
  patronymic?: string;
  /** Legacy single-line; split into last/first when parts omitted. */
  name?: string;
  password?: string;
};

export async function registerUser(page: Page, input: RegisterInput) {
  let lastName = input.lastName?.trim() || '';
  let firstName = input.firstName?.trim() || '';
  if ((!lastName || !firstName) && input.name?.trim()) {
    const parts = input.name.trim().split(/\s+/);
    lastName = parts[0] ?? 'User';
    firstName = parts.slice(1).join(' ') || 'Test';
  }
  if (!lastName) lastName = 'User';
  if (!firstName) firstName = 'Test';

  await page.goto('/register');
  await page.getByLabel('Фамилия *').fill(lastName);
  await page.getByLabel('Имя *').fill(firstName);
  if (input.patronymic) {
    await page.getByLabel('Отчество').fill(input.patronymic);
  }
  await page.getByLabel('E-mail').fill(input.email);
  await page.getByLabel('Пароль').fill(input.password ?? E2E_PASSWORD);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
