import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Local disk root outside webroot (configurable). */
export function resolvePhotoStorageRoot(): string {
  const configured = process.env.CARD_PHOTO_STORAGE_DIR?.trim();
  if (configured) {
    return configured;
  }
  return join(process.cwd(), 'storage', 'card-photos');
}

export function ensurePhotoStorageRoot(): string {
  const root = resolvePhotoStorageRoot();
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true, mode: 0o750 });
  }
  return root;
}

export function photoFilePath(storageKey: string): string {
  // storageKey is always server-generated `${uuid}.webp`
  return join(ensurePhotoStorageRoot(), storageKey);
}
