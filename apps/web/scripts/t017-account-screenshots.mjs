import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.PROTO_URL ?? 'http://127.0.0.1:3017';
const outDir =
  process.env.SHOT_DIR ??
  '/Users/denisgurov/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-6c01b0d9-bb73-4088-90dc-9c954b4af33c/files/media/t-017-account-prototype';

mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
  { name: '1440x900', width: 1440, height: 900 },
];

const scenes = [
  { id: 'view', click: '1. Просмотр' },
  { id: 'dirty', click: '2. Несохранённое имя' },
  { id: 'save-error', click: '3. Ошибка сохранения' },
  { id: 'password', click: '4. Смена пароля' },
  { id: 'vk', click: '5. VK без пароля' },
  { id: 'delete', click: '6–9. Удаление' },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${base}/prototypes/account`, { waitUntil: 'networkidle' });

  // Default view shot
  await page.screenshot({
    path: join(outDir, `${vp.name}-view.png`),
    fullPage: true,
  });

  for (const scene of scenes.slice(1)) {
    await page.getByRole('button', { name: scene.click }).click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: join(outDir, `${vp.name}-${scene.id}.png`),
      fullPage: true,
    });
  }

  // Horizontal overflow check on view
  await page.getByRole('button', { name: '1. Просмотр' }).click();
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
    };
  });
  console.log(vp.name, overflow);
}

await browser.close();
console.log('Wrote screenshots to', outDir);
