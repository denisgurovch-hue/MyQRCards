import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { processCardPhotoUpload } from './card-photo.processor';
import { photoFilePath } from './card-photo.storage';
import { normalizePublicAppUrl } from './public-app-url';

@Injectable()
export class CardPhotoService {
  private readonly logger = new Logger(CardPhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private publicMediaUrl(storageKey: string): string {
    const base = normalizePublicAppUrl(
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000',
    );
    return `${base}/api/v1/media/cards/${encodeURIComponent(storageKey)}`;
  }

  private async requireOwnedCard(userId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, userId, deletedAt: null },
      select: { id: true, photoId: true },
    });
    if (!card) {
      throw new AppError('NOT_FOUND', 'Card not found', HttpStatus.NOT_FOUND);
    }
    return card;
  }

  async upload(userId: string, cardId: string, file: Express.Multer.File) {
    const card = await this.requireOwnedCard(userId, cardId);

    let processed;
    try {
      processed = await processCardPhotoUpload(file);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.warn('Photo validation failed');
      throw new AppError(
        'VALIDATION_ERROR',
        'Файл должен быть изображением JPEG, PNG или WebP размером до 5 MB',
        HttpStatus.BAD_REQUEST,
      );
    }

    const absolutePath = photoFilePath(processed.storageKey);
    try {
      await fs.writeFile(absolutePath, processed.buffer, { mode: 0o640 });
    } catch {
      this.logger.warn('Photo write failed');
      throw new AppError(
        'PHOTO_STORAGE_FAILED',
        'Не удалось сохранить изображение',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const previousPhotoId = card.photoId;
    let previousKey: string | null = null;
    if (previousPhotoId) {
      const previous = await this.prisma.cardPhoto.findUnique({
        where: { id: previousPhotoId },
        select: { storageKey: true },
      });
      previousKey = previous?.storageKey ?? null;
    }

    try {
      const photo = await this.prisma.$transaction(async (tx) => {
        const created = await tx.cardPhoto.create({
          data: {
            cardId: card.id,
            storageKey: processed.storageKey,
            mimeType: processed.mimeType,
            width: processed.width,
            height: processed.height,
            sizeBytes: processed.sizeBytes,
          },
        });

        const url = this.publicMediaUrl(created.storageKey);
        await tx.card.update({
          where: { id: card.id },
          data: {
            photoId: created.id,
            photoUrl: url,
          },
        });

        if (previousPhotoId) {
          await tx.cardPhoto.deleteMany({
            where: { id: previousPhotoId, cardId: card.id },
          });
        }

        return created;
      });

      if (previousKey && previousKey !== processed.storageKey) {
        await fs.unlink(photoFilePath(previousKey)).catch(() => undefined);
      }

      return {
        photo: {
          id: photo.id,
          url: this.publicMediaUrl(photo.storageKey),
          width: photo.width,
          height: photo.height,
          mime_type: photo.mimeType,
        },
      };
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => undefined);
      this.logger.warn('Photo DB update failed; file rolled back');
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'PHOTO_STORAGE_FAILED',
        'Не удалось сохранить изображение',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(userId: string, cardId: string) {
    const card = await this.requireOwnedCard(userId, cardId);
    if (!card.photoId) {
      return { photo: null };
    }

    const existing = await this.prisma.cardPhoto.findUnique({
      where: { id: card.photoId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: card.id },
        data: { photoId: null, photoUrl: null },
      });
      if (existing) {
        await tx.cardPhoto.delete({ where: { id: existing.id } });
      }
    });

    if (existing) {
      await fs.unlink(photoFilePath(existing.storageKey)).catch(() => undefined);
    }

    return { photo: null };
  }

  async readPublicFile(storageKey: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  } | null> {
    if (!/^[0-9a-f-]{36}\.webp$/i.test(storageKey)) {
      return null;
    }

    const photo = await this.prisma.cardPhoto.findUnique({
      where: { storageKey },
      select: { mimeType: true, storageKey: true },
    });
    if (!photo) {
      return null;
    }

    try {
      const buffer = await fs.readFile(photoFilePath(photo.storageKey));
      return { buffer, mimeType: photo.mimeType };
    } catch {
      return null;
    }
  }
}
