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
import { PrismaService } from '../prisma/prisma.service';
import { QrCodeService } from './qr-code.service';

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
});
