import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type CreateCardInput = {
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  showEmail?: boolean;
};

/** Create a card via edit-v2 create mode (/cards/new → first Save → /edit-v2). */
export async function createCardViaEditor(
  page: Page,
  input: CreateCardInput,
): Promise<string> {
  await page.goto('/cards/new');
  await expect(page.getByText('Добавить ФИО')).toBeVisible();

  await page.getByRole('button', { name: /Изменить основное/i }).click();
  const profile = page.getByRole('dialog', { name: 'Основное' });
  await profile.getByLabel('ФИО *').fill(input.name);
  await profile.getByRole('button', { name: 'Применить' }).click();

  if (input.phone) {
    await page.getByRole('button', { name: 'Добавить телефон' }).click();
    const phoneSheet = page.getByRole('dialog', { name: 'Телефон' });
    await phoneSheet.getByLabel('Номер').fill(input.phone);
    await phoneSheet.getByRole('button', { name: 'Применить' }).click();
  }

  if (input.email) {
    await page.getByRole('button', { name: 'Добавить e-mail' }).click();
    const emailSheet = page.getByRole('dialog', { name: 'E-mail' });
    await emailSheet.getByLabel('E-mail карточки').fill(input.email);
    if (input.showEmail) {
      await emailSheet.getByLabel(/Показывать e-mail публично/i).check();
    }
    await emailSheet.getByRole('button', { name: 'Применить' }).click();
  }

  if (input.slug) {
    await page.getByRole('button', { name: 'Управление' }).click();
    const manage = page.getByRole('dialog', { name: 'Управление визиткой' });
    await manage.getByLabel('Slug').fill(input.slug);
    await manage.getByRole('button', { name: 'Закрыть', exact: true }).click();
  }

  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cards/.+/edit-v2`));
  const cardId = page.url().match(/\/cards\/([^/]+)\/edit-v2/)?.[1];
  if (!cardId) {
    throw new Error('Expected redirect to /cards/{id}/edit-v2 after create');
  }
  return cardId;
}
