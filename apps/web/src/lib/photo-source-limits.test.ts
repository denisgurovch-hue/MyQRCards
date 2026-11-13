import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PHOTO_CLIENT_MAX_BYTES,
  PHOTO_CLIENT_MAX_DIMENSION,
  photoSourceErrorMessage,
  validatePhotoSourceFile,
} from './photo-source-limits';

describe('photo-source-limits', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects disallowed mime types', async () => {
    const file = new File(['x'], 'x.gif', { type: 'image/gif' });
    await expect(validatePhotoSourceFile(file)).rejects.toThrow(
      photoSourceErrorMessage('type'),
    );
  });

  it('rejects oversized files before decoding', async () => {
    const file = new File([new Uint8Array(PHOTO_CLIENT_MAX_BYTES + 1)], 'a.jpg', {
      type: 'image/jpeg',
    });
    await expect(validatePhotoSourceFile(file)).rejects.toThrow(
      photoSourceErrorMessage('size'),
    );
  });

  it('rejects sources above 4000×4000', async () => {
    class FakeImage {
      naturalWidth = PHOTO_CLIENT_MAX_DIMENSION + 1;
      naturalHeight = 100;
      decoding = 'async';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:fake',
      revokeObjectURL: vi.fn(),
    });

    const file = new File([new Uint8Array(10)], 'wide.jpg', {
      type: 'image/jpeg',
    });
    await expect(validatePhotoSourceFile(file)).rejects.toThrow(
      photoSourceErrorMessage('dimensions'),
    );
  });

  it('accepts a valid jpeg within limits', async () => {
    class FakeImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      decoding = 'async';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:fake',
      revokeObjectURL: vi.fn(),
    });

    const file = new File([new Uint8Array(10)], 'ok.jpg', {
      type: 'image/jpeg',
    });
    await expect(validatePhotoSourceFile(file)).resolves.toEqual({
      width: 1200,
      height: 800,
    });
  });
});
