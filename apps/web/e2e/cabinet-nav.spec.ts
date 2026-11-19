import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/register';
import { createCardViaEditor } from './helpers/create-card';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

/**
 * One registration per file — register is rate-limited (10/min) across the suite.
 * Covers hub escape, dirty leave, Отменить reset, present + account back.
 */
test.describe('cabinet navigation (T-022)', () => {
  test('hub escapes: create save, dirty leave, present, account', async ({
    page,
  }) => {
    const ownerEmail = email('nav');
    await registerUser(page, {
      email: ownerEmail,
      name: 'Nav Owner',
      password,
    });

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

    // Dirty leave confirm, then stay.
    await page.getByRole('button', { name: /Изменить основное/i }).click();
    const profile = page.getByRole('dialog', { name: 'Основное' });
    await profile.getByLabel('Фамилия *').fill('Nav');
    await profile.getByLabel('Имя *').fill('Changed');
    await profile.getByRole('button', { name: 'Применить' }).click();

    await page.getByRole('link', { name: 'К визиткам' }).click();
    const leave = page.getByRole('dialog', {
      name: 'Данные не сохранены. Закрыть?',
    });
    await expect(leave).toBeVisible();
    await leave.getByRole('button', { name: 'Остаться' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/edit-v2`));

    // Отменить = reset dirty, no navigation.
    await page.getByRole('button', { name: 'Отменить' }).click();
    const cancel = page.getByRole('dialog', { name: 'Отменить изменения?' });
    await expect(cancel).toBeVisible();
    await cancel.getByRole('button', { name: 'Отменить изменения' }).click();
    await expect(page).toHaveURL(new RegExp(`/cards/${cardId}/edit-v2`));
    await expect(page.getByText('Nav Card Changed')).toHaveCount(0);

    // Clean escape to list.
    await page.getByRole('link', { name: 'К визиткам' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Nav Card')).toBeVisible();

    // Present: X + brand → dashboard.
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

    // Account → Кабинет.
    await page.goto('/account');
    await expect(page.getByRole('link', { name: 'Кабинет' })).toBeVisible();
    await page.getByRole('link', { name: 'Кабинет' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
