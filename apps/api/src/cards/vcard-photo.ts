import { Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import { photoFilePath } from './card-photo.storage';

/** Max edge length for contact-friendly avatars in vCard. */
export const VCARD_PHOTO_MAX_EDGE = 512;

/** Target JPEG quality after resize. */
export const VCARD_PHOTO_JPEG_QUALITY = 80;

/** Soft cap: re-encode at lower quality if still larger. */
export const VCARD_PHOTO_MAX_BYTES = 150 * 1024;

const logger = new Logger('VcardPhoto');

/**
 * Read a stored card photo and return JPEG base64 for PHOTO;ENCODING=b.
 * Returns null on missing/unreadable files (caller omits PHOTO).
 */
export async function jpegBase64ForVcardPhoto(
  storageKey: string,
): Promise<string | null> {
  if (!/^[0-9a-f-]{36}\.webp$/i.test(storageKey)) {
    return null;
  }

  const absolutePath = photoFilePath(storageKey);
  try {
    await fs.access(absolutePath);
  } catch {
    logger.warn('Card photo file missing for vCard embed');
    return null;
  }

  try {
    let jpeg = await sharp(absolutePath)
      .rotate()
      .resize(VCARD_PHOTO_MAX_EDGE, VCARD_PHOTO_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: VCARD_PHOTO_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    if (jpeg.length > VCARD_PHOTO_MAX_BYTES) {
      jpeg = await sharp(jpeg)
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer();
    }

    return jpeg.toString('base64');
  } catch {
    logger.warn('Failed to convert card photo for vCard embed');
    return null;
  }
}
