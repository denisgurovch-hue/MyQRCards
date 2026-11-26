import { ConfigService } from '@nestjs/config';
import { CardStatus } from '@prisma/client';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { CardsService } from './cards.service';
import {
  LOCK_SCREEN_HEIGHT,
  LOCK_SCREEN_WIDTH,
  LockScreenImageService,
} from './lock-screen-image.service';
import { lockScreenFontFiles } from './lock-screen-fonts';
import { PrismaService } from '../prisma/prisma.service';
import { QrCodeService } from './qr-code.service';

/** Count near-ink pixels in a horizontal band (dark BG #0b1520). */
function countInkInBand(
  png: PNG,
  top: number,
  bottom: number,
  bg = { r: 11, g: 21, b: 32 },
): number {
  let ink = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      const dr = Math.abs(png.data[i] - bg.r);
      const dg = Math.abs(png.data[i + 1] - bg.g);
      const db = Math.abs(png.data[i + 2] - bg.b);
      if (dr + dg + db > 40) {
        ink++;
      }
    }
  }
  return ink;
}

/**
 * .notdef tofu boxes are near-identical hollow rectangles.
 * Real Cyrillic/Latin glyphs produce a more varied column-ink profile.
 */
function columnInkEntropy(
  png: PNG,
  top: number,
  bottom: number,
  bg = { r: 11, g: 21, b: 32 },
): number {
  const cols: number[] = new Array(png.width).fill(0);
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      const dr = Math.abs(png.data[i] - bg.r);
      const dg = Math.abs(png.data[i + 1] - bg.g);
      const db = Math.abs(png.data[i + 2] - bg.b);
      if (dr + dg + db > 40) {
        cols[x]++;
      }
    }
  }
  const active = cols.filter((c) => c > 0);
  if (active.length < 2) {
    return 0;
  }
  const mean = active.reduce((a, b) => a + b, 0) / active.length;
  const variance =
    active.reduce((sum, c) => sum + (c - mean) ** 2, 0) / active.length;
  return Math.sqrt(variance);
}

describe('LockScreenImageService', () => {
  const ownedCard: {
    id: string;
    slug: string;
    displayName: string;
    jobTitle: string;
    companyName: string;
    status: CardStatus;
    photoId: string | null;
  } = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'demo-owner',
    displayName: 'Иван Иванов',
    jobTitle: 'Инженер',
    companyName: 'Signet',
    status: CardStatus.published,
    photoId: null,
  };

  const cards = {
    findOwnedOrThrow: jest.fn(async () => ownedCard),
  };

  const prisma = {
    cardPhoto: {
      findUnique: jest.fn(),
    },
  };

  const qrCodes = {
    pngBufferForUrl: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) =>
      key === 'WEB_ORIGIN' ? 'https://cards.example/' : undefined,
    ),
  };

  let service: LockScreenImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    ownedCard.status = CardStatus.published;
    ownedCard.photoId = null;
    cards.findOwnedOrThrow.mockResolvedValue(ownedCard);
    qrCodes.pngBufferForUrl.mockImplementation(async (url: string) => {
      // Minimal valid QR via real QrCodeService path is heavy; stub a white square
      // then replace with a real QR for decode tests below.
      const { default: QRCode } = await import('qrcode');
      return QRCode.toBuffer(url, {
        type: 'png',
        width: 720,
        errorCorrectionLevel: 'M',
        margin: 4,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    });
    service = new LockScreenImageService(
      cards as unknown as CardsService,
      qrCodes as unknown as QrCodeService,
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it(
    'renders 1179×2556 PNG with scannable QR for published cards',
    async () => {
      const { buffer, filename } = await service.generateForOwner(
        'user-1',
        ownedCard.id,
      );
      expect(filename).toBe('demo-owner-lock-screen.png');
      expect(cards.findOwnedOrThrow).toHaveBeenCalledWith('user-1', ownedCard.id);
      expect(qrCodes.pngBufferForUrl).toHaveBeenCalledWith(
        'https://cards.example/u/demo-owner',
        720,
      );

      const png = PNG.sync.read(buffer);
      expect(png.width).toBe(LOCK_SCREEN_WIDTH);
      expect(png.height).toBe(LOCK_SCREEN_HEIGHT);

      const decoded = jsQR(
        new Uint8ClampedArray(
          png.data.buffer,
          png.data.byteOffset,
          png.data.byteLength,
        ),
        png.width,
        png.height,
      );
      expect(decoded?.data).toBe('https://cards.example/u/demo-owner');
    },
    30_000,
  );

  it('omits QR generation for draft cards', async () => {
    ownedCard.status = CardStatus.draft;
    const { buffer, filename } = await service.generateForOwner(
      'user-1',
      ownedCard.id,
    );
    expect(filename).toBe('demo-owner-lock-screen.png');
    expect(qrCodes.pngBufferForUrl).not.toHaveBeenCalled();

    const png = PNG.sync.read(buffer);
    expect(png.width).toBe(LOCK_SCREEN_WIDTH);
    expect(png.height).toBe(LOCK_SCREEN_HEIGHT);

    const decoded = jsQR(
      new Uint8ClampedArray(
        png.data.buffer,
        png.data.byteOffset,
        png.data.byteLength,
      ),
      png.width,
      png.height,
    );
    expect(decoded).toBeNull();
  });

  it('bundles Noto Sans font files for lock-screen text', () => {
    const files = lockScreenFontFiles();
    expect(files.length).toBe(2);
    for (const file of files) {
      expect(file).toMatch(/NotoSans-(Regular|Bold)\.ttf$/);
    }
  });

  it(
    'renders readable Cyrillic/Latin text (not tofu boxes)',
    async () => {
      ownedCard.displayName = 'Иван Иванов';
      ownedCard.jobTitle = 'Инженер';
      ownedCard.companyName = 'Signet Labs';
      ownedCard.status = CardStatus.published;

      const { buffer } = await service.generateForOwner('user-1', ownedCard.id);
      const png = PNG.sync.read(buffer);

      // Name band for no-photo layout starts near y=520 (68px bold).
      const nameTop = 470;
      const nameBottom = 620;
      const nameInk = countInkInBand(png, nameTop, nameBottom);
      // Real glyphs for "Иван Иванов" at 68px leave thousands of ink pixels;
      // missing-font tofu / empty text stays far lower.
      expect(nameInk).toBeGreaterThan(4_000);

      const entropy = columnInkEntropy(png, nameTop, nameBottom);
      // Identical □ boxes share a flat column profile; real letters vary.
      expect(entropy).toBeGreaterThan(8);

      // Meta line (job · company) below the name.
      const metaInk = countInkInBand(png, 620, 750);
      expect(metaInk).toBeGreaterThan(1_500);

      // Footer "Signet" near the bottom.
      const footerInk = countInkInBand(png, 2420, 2500);
      expect(footerInk).toBeGreaterThan(400);
    },
    30_000,
  );
});
