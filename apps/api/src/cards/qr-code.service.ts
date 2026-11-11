import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';
import { AppError } from '../common/errors/app-error';
import {
  normalizePublicAppUrl,
  publicCardCanonicalUrl,
} from './public-app-url';
import { PublicCardsService } from './public-cards.service';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

const PNG_SIZE = 1024;

@Injectable()
export class QrCodeService {
  constructor(
    private readonly publicCards: PublicCardsService,
    private readonly config: ConfigService,
  ) {}

  private canonicalUrlFor(slug: string): string {
    let base: string;
    try {
      base = normalizePublicAppUrl(this.config.get<string>('WEB_ORIGIN'));
    } catch (error) {
      throw new AppError(
        'CONFIG_ERROR',
        error instanceof Error ? error.message : 'Invalid WEB_ORIGIN',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return publicCardCanonicalUrl(base, slug);
  }

  async resolvePublishedUrl(rawSlug: string): Promise<{
    slug: string;
    url: string;
  }> {
    const slug = await this.publicCards.requirePublishedSlug(rawSlug);
    return { slug, url: this.canonicalUrlFor(slug) };
  }

  async generatePng(rawSlug: string): Promise<{
    slug: string;
    url: string;
    buffer: Buffer;
    filename: string;
  }> {
    const { slug, url } = await this.resolvePublishedUrl(rawSlug);
    try {
      const buffer = await QRCode.toBuffer(url, {
        ...QR_OPTIONS,
        type: 'png',
        width: PNG_SIZE,
      });
      if (!buffer?.length) {
        throw new Error('Empty PNG buffer');
      }
      return {
        slug,
        url,
        buffer,
        filename: `qrcard-${slug}.png`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'QR_GENERATION_FAILED',
        'Failed to generate QR PNG',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateSvg(rawSlug: string): Promise<{
    slug: string;
    url: string;
    svg: string;
    filename: string;
  }> {
    const { slug, url } = await this.resolvePublishedUrl(rawSlug);
    try {
      const svg = await QRCode.toString(url, {
        ...QR_OPTIONS,
        type: 'svg',
      });
      if (!svg?.includes('<svg') || !svg.includes('viewBox')) {
        throw new Error('Invalid SVG payload');
      }
      return {
        slug,
        url,
        svg,
        filename: `qrcard-${slug}.svg`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'QR_GENERATION_FAILED',
        'Failed to generate QR SVG',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
