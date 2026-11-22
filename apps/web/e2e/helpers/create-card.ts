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
  await expect(page.getByRole('button', { name: /Изменить основное/i })).toBeVisible();

  await page.getByRole('button', { name: /Изменить основное/i }).click();
  const profile = page.getByRole('dialog', { name: 'Основное' });
  const parts = input.name.trim().split(/\s+/);
  const lastName = parts[0] ?? input.name;
  const firstName = parts.slice(1).join(' ') || 'User';
  await profile.getByLabel('Фамилия *').fill(lastName);
  await profile.getByLabel('Имя *').fill(firstName);
  await profile.getByRole('button', { name: 'Применить' }).click();

  if (input.phone) {
    await page
      .getByRole('button', { name: 'Добавить телефон', exact: true })
      .click();
    const phoneSheet = page.getByRole('dialog', { name: 'Телефон' });
    await phoneSheet.getByLabel('Номер').fill(input.phone);
    await phoneSheet.getByRole('button', { name: 'Применить' }).click();
  }

  if (input.email) {
    // Create mode prefills account email (T-023), so the empty CTA may be absent.
    // Open the email contact row by stable data attribute — avoid click().catch races.
    const emailRow = page.locator(
      '[data-contact-key="email"] button.edit-v2-contact-main',
    );
    await expect(emailRow).toBeVisible();
    await emailRow.click();
    const emailSheet = page.getByRole('dialog', { name: 'E-mail' });
    await expect(emailSheet).toBeVisible();
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
