import { expect, test } from '@playwright/test';
import { createCardViaEditor } from './helpers/create-card';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function register(
  page: import('@playwright/test').Page,
  name: string,
  mail: string,
) {
  await page.goto('/register');
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('E-mail').fill(mail);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('cabinet navigation (T-022)', () => {
  test('create save stays on edit; К визиткам returns to list', async ({
    page,
  }) => {
    const ownerEmail = email('nav-create');
    await register(page, 'Nav Create', ownerEmail);

    await expect(
      page.getByRole('link', { name: 'Signet — к списку визиток' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Создать визитку' }),
    ).toBeVisible();

    const cardId = await createCardViaEditor(page, {
      name: 'Nav Card',
      slug: `nav-${Date.now().toString(36)}`,
    });

    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/edit-v2`));
    await expect(
      page.getByRole('link', { name: 'К визиткам' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Управление' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'К визиткам' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Nav Card')).toBeVisible();
  });

  test('dirty leave from edit asks confirm; Отменить only resets', async ({
    page,
  }) => {
    const ownerEmail = email('nav-dirty');
    await register(page, 'Nav Dirty', ownerEmail);
    const cardId = await createCardViaEditor(page, {
      name: 'Dirty Card',
      slug: `dirty-${Date.now().toString(36)}`,
    });

    await page.getByRole('button', { name: /Изменить основное/i }).click();
    const profile = page.getByRole('dialog', { name: 'Основное' });
    await profile.getByLabel('ФИО *').fill('Dirty Card Changed');
    await profile.getByRole('button', { name: 'Применить' }).click();

    await page.getByRole('link', { name: 'К визиткам' }).click();
    const leave = page.getByRole('dialog', {
      name: 'Данные не сохранены. Закрыть?',
    });
    await expect(leave).toBeVisible();
    await leave.getByRole('button', { name: 'Остаться' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/edit-v2`));

    await page.getByRole('button', { name: 'Отменить' }).click();
    const cancel = page.getByRole('dialog', { name: 'Отменить изменения?' });
    await expect(cancel).toBeVisible();
    await cancel.getByRole('button', { name: 'Отменить изменения' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/edit-v2`));
    await expect(page.getByText('Dirty Card Changed')).toHaveCount(0);
  });

  test('present close and brand return to dashboard', async ({ page }) => {
    const ownerEmail = email('nav-present');
    await register(page, 'Nav Present', ownerEmail);
    const cardId = await createCardViaEditor(page, {
      name: 'Present Nav',
      slug: `pnav-${Date.now().toString(36)}`,
    });

    await page.goto(`/cards/${cardId}/present`);
    await expect(
      page.getByRole('link', { name: 'Signet — к списку визиток' }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Закрыть и вернуться к списку визиток' })
      .click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/cards/${cardId}/present`);
    await page
      .getByRole('link', { name: 'Signet — к списку визиток' })
      .click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('account Кабинет returns to dashboard', async ({ page }) => {
    const ownerEmail = email('nav-account');
    await register(page, 'Nav Account', ownerEmail);
    await page.goto('/account');
    await expect(page.getByRole('link', { name: 'Кабинет' })).toBeVisible();
    await page.getByRole('link', { name: 'Кабинет' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
