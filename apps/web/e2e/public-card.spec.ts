import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/register';
import { createCardViaEditor } from './helpers/create-card';

const password = 'StrongPassphrase123!';

function email(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test.describe('public card page', () => {
  test('publish, open unauthenticated, hide email, unpublish', async ({
    browser,
  }) => {
    const owner = await browser.newContext();
    const ownerPage = await owner.newPage();
    const ownerEmail = email('owner');
    const slug = `pub-${Date.now().toString(36)}`;

    await registerUser(ownerPage, {
      email: ownerEmail,
      name: 'Owner Test',
      password,
    });

    await createCardViaEditor(ownerPage, {
      name: 'Public Name',
      email: 'visible@example.com',
      showEmail: true,
      slug,
      phone: '+79991112233',
    });

    await ownerPage.getByRole('button', { name: 'Управление' }).click();
    const manage = ownerPage.getByRole('dialog', { name: 'Управление визиткой' });
    await manage.getByRole('button', { name: 'Опубликовать' }).click();
    const publishConfirm = ownerPage.getByRole('dialog', {
      name: 'Опубликовать визитку?',
    });
    await expect(publishConfirm.getByText(/конфиденциальную информацию/i)).toBeVisible();
    await publishConfirm.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(manage.getByText(/Статус сейчас:\s*Опубликовано/i)).toBeVisible();
    await manage.getByRole('button', { name: 'Закрыть', exact: true }).click();

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/u/${slug}`);
    await expect(guestPage.getByRole('heading', { name: 'Public Name' })).toBeVisible();
    await expect(
      guestPage.getByRole('link', { name: 'Написать · visible@example.com' }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole('link', { name: 'Позвонить · +79991112233' }),
    ).toBeVisible();
    await expect(guestPage.locator('.public-contact-icon')).toHaveCount(2);

    const publicJson = await guestPage.request.get(
      `/api/v1/public/cards/${slug}`,
    );
    expect(publicJson.ok()).toBeTruthy();
    const body = await publicJson.json();
    expect(body.card.email).toBe('visible@example.com');
    expect(body.card).not.toHaveProperty('userId');

    await ownerPage
      .getByRole('button', { name: 'visible@example.com', exact: true })
      .click();
    const emailSheet = ownerPage.getByRole('dialog', { name: 'E-mail' });
    await emailSheet.getByRole('checkbox', { name: /Показывать e-mail/i }).uncheck();
    await emailSheet.getByRole('button', { name: 'Применить' }).click();
    await Promise.all([
      ownerPage.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/cards/`) &&
          response.request().method() === 'PATCH' &&
          response.ok(),
      ),
      ownerPage.getByRole('button', { name: 'Сохранить', exact: true }).click(),
    ]);

    const hiddenJson = await guestPage.request.get(
      `/api/v1/public/cards/${slug}`,
    );
    expect(hiddenJson.ok()).toBeTruthy();
    const hiddenBody = await hiddenJson.json();
    expect(hiddenBody.card.email).toBeNull();
    expect(JSON.stringify(hiddenBody)).not.toContain('visible@example.com');


    await guestPage.reload();
    await expect(guestPage.getByRole('heading', { name: 'Public Name' })).toBeVisible();
    await expect(
      guestPage.getByRole('link', { name: 'Написать · visible@example.com' }),
    ).toHaveCount(0);
    await expect(
      guestPage.getByRole('link', { name: 'Позвонить · +79991112233' }),
    ).toBeVisible();

    await ownerPage.getByRole('button', { name: 'Управление' }).click();
    await manage.getByRole('button', { name: 'Снять с публикации' }).click();
    await expect(manage.getByText(/Статус сейчас:\s*Черновик/i)).toBeVisible();

    await guestPage.reload();
    await expect(guestPage.getByRole('heading', { name: 'Визитка не найдена' })).toBeVisible();

    await guest.close();
    await owner.close();
  });
});
