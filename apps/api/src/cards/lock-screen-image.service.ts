import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardStatus } from '@prisma/client';
import sharp, { type OverlayOptions } from 'sharp';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CardsService } from './cards.service';
import {
  normalizePublicAppUrl,
  publicCardCanonicalUrl,
} from './public-app-url';
import { QrCodeService } from './qr-code.service';
import { jpegBufferForCardPhoto } from './vcard-photo';

/** Portrait export sized for modern phone lock screens. */
export const LOCK_SCREEN_WIDTH = 1179;
export const LOCK_SCREEN_HEIGHT = 2556;

/** Photo edge on the lock-screen composition. */
const PHOTO_EDGE = 420;

/** QR module canvas size before compositing. */
const QR_SIZE = 720;

const BG = '#0b1520';
const INK = '#f4f8fb';
const MUTED = '#8a9aab';
const ACCENT = '#0e9aa7';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
    if (lines.length >= maxLines) {
      break;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }
  // Truncate last line if we still overflowed a single long word.
  return lines.map((line, i) => {
    if (line.length <= maxChars) {
      return line;
    }
    const cut = line.slice(0, Math.max(1, maxChars - 1));
    return i === lines.length - 1 ? `${cut}…` : cut;
  });
}

@Injectable()
export class LockScreenImageService {
  constructor(
    private readonly cards: CardsService,
    private readonly qrCodes: QrCodeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private canonicalUrlFor(slug: string): string {
    try {
      const base = normalizePublicAppUrl(this.config.get<string>('WEB_ORIGIN'));
      return publicCardCanonicalUrl(base, slug);
    } catch (error) {
      throw new AppError(
        'CONFIG_ERROR',
        error instanceof Error ? error.message : 'Invalid WEB_ORIGIN',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async resolvePhotoJpeg(
    photoId: string | null,
  ): Promise<Buffer | null> {
    if (!photoId) {
      return null;
    }
    const photo = await this.prisma.cardPhoto.findUnique({
      where: { id: photoId },
      select: { storageKey: true },
    });
    if (!photo?.storageKey) {
      return null;
    }
    return jpegBufferForCardPhoto(photo.storageKey, PHOTO_EDGE);
  }

  private buildLayoutSvg(input: {
    displayName: string;
    metaLine: string;
    initial: string;
    hasPhoto: boolean;
    hasQr: boolean;
  }): Buffer {
    const nameLines = wrapLines(input.displayName, 22, 3);
    const metaLines = input.metaLine
      ? wrapLines(input.metaLine, 28, 2)
      : [];

    const nameStartY = input.hasPhoto ? 780 : 520;
    const nameTspans = nameLines
      .map((line, i) => {
        const dy = i === 0 ? 0 : 78;
        return `<tspan x="589.5" dy="${dy}">${escapeXml(line)}</tspan>`;
      })
      .join('');
    const metaStartY = nameStartY + nameLines.length * 78 + 36;
    const metaTspans = metaLines
      .map((line, i) => {
        const dy = i === 0 ? 0 : 48;
        return `<tspan x="589.5" dy="${dy}">${escapeXml(line)}</tspan>`;
      })
      .join('');

    const avatar = input.hasPhoto
      ? ''
      : `<circle cx="589.5" cy="420" r="160" fill="#132536" stroke="${ACCENT}" stroke-width="6"/>
         <text x="589.5" y="445" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="120" font-weight="700" fill="${INK}">${escapeXml(input.initial)}</text>`;

    const qrHintY = input.hasQr ? 2140 : 1680;
    const qrLabel = input.hasQr
      ? `<text x="589.5" y="${qrHintY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" fill="${MUTED}">Сканируйте QR · Signet</text>`
      : `<text x="589.5" y="${qrHintY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" fill="${MUTED}">Черновик · QR появится после публикации</text>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${LOCK_SCREEN_WIDTH}" height="${LOCK_SCREEN_HEIGHT}" viewBox="0 0 ${LOCK_SCREEN_WIDTH} ${LOCK_SCREEN_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BG}"/>
  <circle cx="180" cy="220" r="320" fill="#132536" opacity="0.55"/>
  <circle cx="1020" cy="2100" r="380" fill="#132536" opacity="0.45"/>
  ${avatar}
  <text x="589.5" y="${nameStartY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="68" font-weight="700" fill="${INK}">${nameTspans}</text>
  ${
    metaTspans
      ? `<text x="589.5" y="${metaStartY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="36" fill="${MUTED}">${metaTspans}</text>`
      : ''
  }
  ${qrLabel}
  <text x="589.5" y="2460" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="32" font-weight="600" fill="${ACCENT}">Signet</text>
</svg>`;

    return Buffer.from(svg, 'utf8');
  }

  async generateForOwner(
    userId: string,
    cardId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const card = await this.cards.findOwnedOrThrow(userId, cardId);
    const published = card.status === CardStatus.published;
    const metaLine = [card.jobTitle, card.companyName]
      .filter(Boolean)
      .join(' · ');
    const initial = (card.displayName.trim().slice(0, 1) || '?').toUpperCase();

    let photoJpeg: Buffer | null = null;
    try {
      photoJpeg = await this.resolvePhotoJpeg(card.photoId);
    } catch {
      photoJpeg = null;
    }

    const layoutSvg = this.buildLayoutSvg({
      displayName: card.displayName,
      metaLine,
      initial,
      hasPhoto: Boolean(photoJpeg),
      hasQr: published,
    });

    const composites: OverlayOptions[] = [];

    if (photoJpeg) {
      const circleMask = Buffer.from(
        `<svg width="${PHOTO_EDGE}" height="${PHOTO_EDGE}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${PHOTO_EDGE / 2}" cy="${PHOTO_EDGE / 2}" r="${PHOTO_EDGE / 2}" fill="#fff"/>
        </svg>`,
      );
      const roundPhoto = await sharp(photoJpeg)
        .resize(PHOTO_EDGE, PHOTO_EDGE, { fit: 'cover' })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer();
      composites.push({
        input: roundPhoto,
        left: Math.round((LOCK_SCREEN_WIDTH - PHOTO_EDGE) / 2),
        top: 260,
      });
    }

    if (published) {
      const url = this.canonicalUrlFor(card.slug);
      const qrPng = await this.qrCodes.pngBufferForUrl(url, QR_SIZE);
      const qrPad = 36;
      const qrFrame = QR_SIZE + qrPad * 2;
      const framedQr = await sharp({
        create: {
          width: qrFrame,
          height: qrFrame,
          channels: 3,
          background: '#ffffff',
        },
      })
        .composite([{ input: qrPng, left: qrPad, top: qrPad }])
        .png()
        .toBuffer();
      composites.push({
        input: framedQr,
        left: Math.round((LOCK_SCREEN_WIDTH - qrFrame) / 2),
        top: 1280,
      });
    }

    try {
      const buffer = await sharp(layoutSvg)
        .resize(LOCK_SCREEN_WIDTH, LOCK_SCREEN_HEIGHT)
        .composite(composites)
        .png({ compressionLevel: 9 })
        .toBuffer();

      if (!buffer?.length) {
        throw new Error('Empty lock-screen PNG');
      }

      return {
        buffer,
        filename: `${card.slug}-lock-screen.png`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'LOCK_SCREEN_GENERATION_FAILED',
        'Failed to generate lock-screen image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
