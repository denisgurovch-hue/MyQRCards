import { expect, test } from '@playwright/test';
import { createCardViaEditor } from './helpers/create-card';
import { registerUser } from './helpers/register';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('dashboard card lifecycle', () => {
  test('publish, unpublish, and delete from Ещё menu', async ({ page }) => {
    const slug = `life-${Date.now().toString(36)}`;
    await registerUser(page, {
      email: email('life'),
      name: 'Life Owner',
      password,
    });

    await createCardViaEditor(page, {
      name: 'Life Card',
      slug,
    });

    await page.goto('/dashboard');
    const row = page.locator('li.card-item', { hasText: 'Life Card' });
    await expect(row.getByText('Черновик')).toBeVisible();
    await expect(row.getByRole('link', { name: 'Открыть' })).toHaveCount(0);
    await expect(
      row.getByText(/Опубликуйте визитку через «Ещё»/),
    ).toBeVisible();

    await row.getByRole('button', { name: 'Ещё' }).click();
    const manage = page.getByRole('dialog', { name: 'Управление' });
    await expect(manage).toBeVisible();
    await manage.getByRole('button', { name: 'Опубликовать' }).click();

    const publishConfirm = page.getByRole('dialog', {
      name: 'Опубликовать визитку?',
    });
    await expect(publishConfirm).toBeVisible();
    await publishConfirm.getByRole('button', { name: 'Опубликовать' }).click();

    await expect(row.getByText('Опубликовано')).toBeVisible();
    await expect(row.getByRole('link', { name: 'Открыть' })).toBeVisible();

    await row.getByRole('button', { name: 'Ещё' }).click();
    await manage.getByRole('button', { name: 'Снять с публикации' }).click();
    await expect(row.getByText('Черновик')).toBeVisible();
    await expect(row.getByRole('link', { name: 'Открыть' })).toHaveCount(0);

    await row.getByRole('button', { name: 'Ещё' }).click();
    await manage.getByRole('button', { name: 'Удалить' }).click();
    const deleteConfirm = page.getByRole('dialog', {
      name: 'Удалить визитку?',
    });
    await expect(deleteConfirm).toBeVisible();
    await deleteConfirm.getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText('Life Card')).toHaveCount(0);
  });
});
