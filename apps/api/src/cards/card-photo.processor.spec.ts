import sharp from 'sharp';
import { processCardPhotoUpload } from './card-photo.processor';

async function makeFile(
  buffer: Buffer,
  overrides: Partial<Express.Multer.File> = {},
): Promise<Express.Multer.File> {
  return {
    fieldname: 'photo',
    originalname: 'upload.bin',
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
    ...overrides,
  };
}

describe('processCardPhotoUpload', () => {
  it('accepts jpeg/png/webp and outputs webp without growing past limits', async () => {
    const jpeg = await sharp({
      create: { width: 120, height: 80, channels: 3, background: '#c33' },
    })
      .jpeg()
      .toBuffer();
    const png = await sharp({
      create: { width: 64, height: 64, channels: 4, background: '#3c9' },
    })
      .png()
      .toBuffer();
    const webp = await sharp({
      create: { width: 90, height: 90, channels: 3, background: '#39c' },
    })
      .webp()
      .toBuffer();

    for (const buffer of [jpeg, png, webp]) {
      const result = await processCardPhotoUpload(await makeFile(buffer));
      expect(result.mimeType).toBe('image/webp');
      expect(result.storageKey).toMatch(/\.webp$/);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
    }
  });

  async function expectBadRequest(promise: Promise<unknown>, messageRe: RegExp) {
    await expect(promise).rejects.toEqual(
      expect.objectContaining({ getStatus: expect.any(Function) }),
    );
    try {
      await promise;
    } catch (error) {
      const err = error as { getStatus: () => number; getResponse: () => unknown };
      expect(err.getStatus()).toBe(400);
      const body = err.getResponse() as { error?: { message?: string } };
      expect(body.error?.message ?? '').toMatch(messageRe);
    }
  }

  it('rejects oversized byte payload', async () => {
    const huge = Buffer.alloc(5 * 1024 * 1024 + 10, 0xff);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    await expectBadRequest(processCardPhotoUpload(await makeFile(huge)), /5 MB/);
  });

  it('rejects dimensions over 4000', async () => {
    const wide = await sharp({
      create: { width: 4001, height: 100, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    await expectBadRequest(processCardPhotoUpload(await makeFile(wide)), /4000/);

    const tall = await sharp({
      create: { width: 100, height: 4001, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    await expectBadRequest(processCardPhotoUpload(await makeFile(tall)), /4000/);
  });

  it('rejects spoofed extension and svg', async () => {
    const spoof = await makeFile(Buffer.from('not-an-image'), {
      originalname: 'face.jpg',
      mimetype: 'image/jpeg',
    });
    await expectBadRequest(processCardPhotoUpload(spoof), /JPEG/);

    const svg = await makeFile(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
      { originalname: 'x.svg', mimetype: 'image/svg+xml' },
    );
    await expectBadRequest(processCardPhotoUpload(svg), /JPEG/);
  });
});
