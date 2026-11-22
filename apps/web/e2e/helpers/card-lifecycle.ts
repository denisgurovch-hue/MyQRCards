import { expect, type Page } from '@playwright/test';

/** PATCH card slug via session cookies (edit chrome no longer exposes Управление). */
export async function patchCardSlug(page: Page, cardId: string, slug: string) {
  const res = await page.request.patch(`/api/v1/cards/${cardId}`, {
    data: { slug },
  });
  expect(res.ok()).toBeTruthy();
}

export async function publishCard(page: Page, cardId: string) {
  const res = await page.request.post(`/api/v1/cards/${cardId}/publish`);
  expect(res.ok()).toBeTruthy();
}

export async function unpublishCard(page: Page, cardId: string) {
  const res = await page.request.post(`/api/v1/cards/${cardId}/unpublish`);
  expect(res.ok()).toBeTruthy();
}
