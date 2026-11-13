import { HttpStatus } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';

export type VcardDisposition = 'inline' | 'attachment';

/**
 * Resolve Content-Disposition mode for public vCard.
 * Default (no query): inline. Only `download=1` selects attachment.
 * Any other value is rejected — clients cannot set disposition arbitrarily.
 */
export function resolveVcardDisposition(
  download: string | string[] | undefined,
): VcardDisposition {
  if (download === undefined) {
    return 'inline';
  }
  if (Array.isArray(download)) {
    throw invalidDownload();
  }
  if (download === '1') {
    return 'attachment';
  }
  throw invalidDownload();
}

function invalidDownload(): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'Invalid download parameter',
    HttpStatus.BAD_REQUEST,
    [{ field: 'download', constraints: { equals: 'Must be omitted or equal to 1' } }],
  );
}
