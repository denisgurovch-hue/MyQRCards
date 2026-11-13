/** Client-side source gates for avatar upload (T-015 / 3b). Server still re-validates the upload. */

export const PHOTO_CLIENT_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_CLIENT_MAX_DIMENSION = 4000;
export const PHOTO_CLIENT_ACCEPT =
  'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PhotoSourceOk = {
  width: number;
  height: number;
};

export function photoSourceErrorMessage(kind: 'type' | 'size' | 'dimensions'): string {
  if (kind === 'type') {
    return 'Файл должен быть изображением JPEG, PNG или WebP';
  }
  if (kind === 'size') {
    return 'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB';
  }
  return `Изображение не должно превышать ${PHOTO_CLIENT_MAX_DIMENSION}×${PHOTO_CLIENT_MAX_DIMENSION} пикселей`;
}

function mimeLooksAllowed(file: File): boolean {
  if (file.type && ALLOWED_MIME.has(file.type)) {
    return true;
  }
  // Some mobile browsers leave type empty; fall back to extension.
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

/**
 * Validate file type, byte size, and natural pixel dimensions before opening the crop UI.
 * Does not replace server-side checks on the cropped upload.
 */
export async function validatePhotoSourceFile(
  file: File,
): Promise<PhotoSourceOk> {
  if (!mimeLooksAllowed(file)) {
    throw new Error(photoSourceErrorMessage('type'));
  }
  if (file.size > PHOTO_CLIENT_MAX_BYTES) {
    throw new Error(photoSourceErrorMessage('size'));
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error('Не удалось прочитать изображение'));
      image.src = objectUrl;
    });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) {
      throw new Error('Не удалось прочитать изображение');
    }
    if (
      width > PHOTO_CLIENT_MAX_DIMENSION ||
      height > PHOTO_CLIENT_MAX_DIMENSION
    ) {
      throw new Error(photoSourceErrorMessage('dimensions'));
    }
    return { width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
