import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  jpegBase64ForVcardPhoto,
  VCARD_PHOTO_MAX_EDGE,
} from './vcard-photo';

describe('vcard-photo', () => {
  let storageDir: string;
  let previousEnv: string | undefined;

  beforeAll(() => {
    storageDir = mkdtempSync(join(tmpdir(), 'vcard-photo-'));
    previousEnv = process.env.CARD_PHOTO_STORAGE_DIR;
    process.env.CARD_PHOTO_STORAGE_DIR = storageDir;
  });

  afterAll(() => {
    if (previousEnv === undefined) {
      delete process.env.CARD_PHOTO_STORAGE_DIR;
    } else {
      process.env.CARD_PHOTO_STORAGE_DIR = previousEnv;
    }
    rmSync(storageDir, { recursive: true, force: true });
  });

  it('converts stored webp to JPEG base64 within edge limit', async () => {
    const key = `${randomUUID()}.webp`;
    const webp = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: '#336699',
      },
    })
      .webp()
      .toBuffer();
    writeFileSync(join(storageDir, key), webp);

    const b64 = await jpegBase64ForVcardPhoto(key);
    expect(b64).toBeTruthy();
    const jpeg = Buffer.from(b64!, 'base64');
    expect(jpeg[0]).toBe(0xff);
    expect(jpeg[1]).toBe(0xd8);

    const meta = await sharp(jpeg).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBeLessThanOrEqual(VCARD_PHOTO_MAX_EDGE);
    expect(meta.height).toBeLessThanOrEqual(VCARD_PHOTO_MAX_EDGE);
  });

  it('returns null for missing file or invalid key', async () => {
    expect(await jpegBase64ForVcardPhoto(`${randomUUID()}.webp`)).toBeNull();
    expect(await jpegBase64ForVcardPhoto('../evil.webp')).toBeNull();
    expect(await jpegBase64ForVcardPhoto('not-a-uuid.jpg')).toBeNull();
  });

  it('returns null when file exists but is not an image', async () => {
    const key = `${randomUUID()}.webp`;
    writeFileSync(join(storageDir, key), Buffer.from('not-an-image'));
    expect(await jpegBase64ForVcardPhoto(key)).toBeNull();
    unlinkSync(join(storageDir, key));
  });
});
