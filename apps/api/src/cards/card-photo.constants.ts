export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_DIMENSION = 4000;
export const PHOTO_FIELD = 'photo';
export const COVER_FIELD = 'cover';
export const PHOTO_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedPhotoMime = (typeof PHOTO_ALLOWED_MIME)[number];
