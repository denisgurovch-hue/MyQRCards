import { ConfigService } from '@nestjs/config';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { QrCodeService } from './qr-code.service';
import { PublicCardsService } from './public-cards.service';

describe('QrCodeService', () => {
  const publicCards = {
    requirePublishedSlug: jest.fn(async (slug: string) => slug),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'WEB_ORIGIN') {
        return 'https://cards.example/';
      }
      return undefined;
    }),
  };

  const service = new QrCodeService(
    publicCards as unknown as PublicCardsService,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    publicCards.requirePublishedSlug.mockImplementation(
      async (slug: string) => slug,
    );
    config.get.mockImplementation((key: string) =>
      key === 'WEB_ORIGIN' ? 'https://cards.example/' : undefined,
    );
  });

  it('PNG encodes exact canonical URL and is 1024x1024', async () => {
    const { buffer, url, filename } = await service.generatePng('demo-slug');
    expect(url).toBe('https://cards.example/u/demo-slug');
    expect(filename).toBe('qrcard-demo-slug.png');

    const png = PNG.sync.read(buffer);
    expect(png.width).toBe(1024);
    expect(png.height).toBe(1024);

    const decoded = jsQR(
      new Uint8ClampedArray(
        png.data.buffer,
        png.data.byteOffset,
        png.data.byteLength,
      ),
      png.width,
      png.height,
    );
    expect(decoded?.data).toBe('https://cards.example/u/demo-slug');
  });

  it('SVG includes viewBox without script/foreignObject', async () => {
    const { svg, url, filename } = await service.generateSvg('demo-slug');
    expect(url).toBe('https://cards.example/u/demo-slug');
    expect(filename).toBe('qrcard-demo-slug.svg');
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/viewBox="/);
    expect(svg).not.toMatch(/<script/i);
    expect(svg).not.toMatch(/foreignObject/i);
    expect(publicCards.requirePublishedSlug).toHaveBeenCalledWith('demo-slug');
  });
});
