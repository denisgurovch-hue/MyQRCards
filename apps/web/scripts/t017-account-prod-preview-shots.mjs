import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.PROTO_URL ?? 'http://127.0.0.1:3017';
const outDir =
  process.env.SHOT_DIR ??
  '/Users/denisgurov/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-6c01b0d9-bb73-4088-90dc-9c954b4af33c/files/media/t-017-account-prod-preview';

mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1440x900', width: 1440, height: 900 },
];

const pages = [
  { id: 'password', path: '/prototypes/account?preview=prod' },
  { id: 'vk', path: '/prototypes/account?preview=prod&auth=vk' },
  { id: 'delete', path: '/prototypes/account?preview=prod&delete=1' },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });

  for (const item of pages) {
    await page.goto(`${base}${item.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: join(outDir, `${vp.name}-${item.id}.png`),
      fullPage: true,
    });
  }

  // Unsaved leave dialog
  await page.goto(`${base}/prototypes/account?preview=prod`, {
    waitUntil: 'networkidle',
  });
  await page.getByLabel('Имя аккаунта').fill('Денис Гуров (черновик)');
  await page.getByRole('link', { name: 'Кабинет' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(outDir, `${vp.name}-leave-confirm.png`),
    fullPage: true,
  });
}

await browser.close();
console.log('Wrote prod-preview screenshots to', outDir);
