import { HttpStatus } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { resolveVcardDisposition } from './vcard-disposition';

describe('resolveVcardDisposition', () => {
  it('defaults to inline when download is omitted', () => {
    expect(resolveVcardDisposition(undefined)).toBe('inline');
  });

  it('uses attachment only for download=1', () => {
    expect(resolveVcardDisposition('1')).toBe('attachment');
  });

  it.each(['', 'true', 'yes', '0', 'attachment', 'inline'])(
    'rejects invalid download=%j',
    (value) => {
      try {
        resolveVcardDisposition(value);
        fail('expected AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = (error as AppError).getResponse() as {
          error: { code: string };
        };
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    },
  );

  it('rejects repeated download query values', () => {
    expect(() => resolveVcardDisposition(['1', '1'])).toThrow(AppError);
  });
});
