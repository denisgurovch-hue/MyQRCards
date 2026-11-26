import { existsSync } from 'fs';
import { join } from 'path';

/** Family name as declared inside the bundled Noto Sans TTF files. */
export const LOCK_SCREEN_FONT_FAMILY = 'Noto Sans';

const FONT_FILES = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'] as const;

/**
 * Resolve the directory that holds lock-screen TTF assets.
 * Works from `apps/api` cwd (jest/dev), compiled `dist/cards`, and Docker `/app`.
 */
export function resolveLockScreenFontsDir(): string {
  const candidates = [
    // Docker runner / apps/api cwd
    join(process.cwd(), 'assets', 'fonts'),
    // Monorepo root cwd
    join(process.cwd(), 'apps', 'api', 'assets', 'fonts'),
    // Compiled service: dist/cards → ../../assets/fonts
    join(__dirname, '..', '..', 'assets', 'fonts'),
    // If nest copies assets next to the compiled file
    join(__dirname, 'assets', 'fonts'),
  ];

  for (const dir of candidates) {
    if (FONT_FILES.every((name) => existsSync(join(dir, name)))) {
      return dir;
    }
  }

  throw new Error(
    `Lock-screen fonts not found (looked for ${FONT_FILES.join(', ')}). ` +
      `Checked: ${candidates.join(' | ')}`,
  );
}

/** Absolute paths to Regular + Bold Noto Sans for resvg. */
export function lockScreenFontFiles(): string[] {
  const dir = resolveLockScreenFontsDir();
  return FONT_FILES.map((name) => join(dir, name));
}
