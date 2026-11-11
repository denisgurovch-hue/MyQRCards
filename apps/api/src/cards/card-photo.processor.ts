import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../common/errors/app-error';
import {
  PHOTO_ALLOWED_MIME,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_DIMENSION,
  type AllowedPhotoMime,
} from './card-photo.constants';

const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function detectMimeByMagic(buffer: Buffer): AllowedPhotoMime | null {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_SIG)) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIG)) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export type ProcessedPhoto = {
  storageKey: string;
  mimeType: 'image/webp';
  width: number;
  height: number;
  sizeBytes: number;
  buffer: Buffer;
};

/**
 * Validate magic bytes + decode with sharp, reject oversized images,
 * re-encode to WebP without metadata (EXIF/GPS stripped).
 */
export async function processCardPhotoUpload(
  file: Express.Multer.File,
): Promise<ProcessedPhoto> {
  if (!file?.buffer?.length) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (file.size > PHOTO_MAX_BYTES || file.buffer.length > PHOTO_MAX_BYTES) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
      HttpStatus.BAD_REQUEST,
    );
  }

  const magicMime = detectMimeByMagic(file.buffer);
  if (!magicMime || !(PHOTO_ALLOWED_MIME as readonly string[]).includes(magicMime)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
      HttpStatus.BAD_REQUEST,
    );
  }

  let normalized: Buffer;
  let width: number;
  let height: number;
  try {
    // rotate() applies EXIF orientation; output has no EXIF when re-encoded.
    normalized = await sharp(file.buffer, {
      failOn: 'error',
      animated: false,
    })
      .rotate()
      .toBuffer();
    const metadata = await sharp(normalized).metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
  } catch {
    throw new AppError(
      'VALIDATION_ERROR',
      'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!width || !height) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (width > PHOTO_MAX_DIMENSION || height > PHOTO_MAX_DIMENSION) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Изображение не должно превышать ${PHOTO_MAX_DIMENSION}×${PHOTO_MAX_DIMENSION} пикселей`,
      HttpStatus.BAD_REQUEST,
    );
  }

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(normalized)
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new AppError(
      'PHOTO_PROCESSING_FAILED',
      'Не удалось обработать изображение',
      HttpStatus.BAD_REQUEST,
    );
  }

  const outMeta = await sharp(webpBuffer).metadata();
  const storageKey = `${randomUUID()}.webp`;

  return {
    storageKey,
    mimeType: 'image/webp',
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
    sizeBytes: webpBuffer.length,
    buffer: webpBuffer,
  };
}
