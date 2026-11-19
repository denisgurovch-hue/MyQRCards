import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizePublicAppUrl,
  publicCardCanonicalUrl,
} from './public-app-url';
import { toPublicCardDto } from './public-card.mapper';
import { PublicCardsService } from './public-cards.service';
import { jpegBase64ForVcardPhoto } from './vcard-photo';
import { buildVCard30 } from './vcard.serializer';

@Injectable()
export class VcardService {
  constructor(
    private readonly publicCards: PublicCardsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

  private async resolvePhotoJpegBase64(
    photoId: string | null,
  ): Promise<string | null> {
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

    return jpegBase64ForVcardPhoto(photo.storageKey);
  }

  async generate(rawSlug: string): Promise<{
    body: string;
    filename: string;
    slug: string;
    cardId: string;
  }> {
    const entity = await this.publicCards.getPublishedCard(rawSlug);
    const card = toPublicCardDto(entity);
    const photoJpegBase64 = await this.resolvePhotoJpegBase64(entity.photoId);

    try {
      const body = buildVCard30({
        displayName: card.displayName,
        lastName: entity.lastName,
        firstName: entity.firstName,
        patronymic: entity.patronymic,
        showPatronymic: entity.showPatronymic,
        jobTitle: card.jobTitle,
        companyName: card.companyName,
        summary: card.summary,
        phone: card.phone,
        email: card.email,
        websiteUrl: card.websiteUrl,
        canonicalUrl: this.canonicalUrlFor(card.slug),
        photoJpegBase64,
      });
      return {
        body,
        filename: `contact-${card.slug}.vcf`,
        slug: card.slug,
        cardId: entity.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'VCARD_GENERATION_FAILED',
        'Failed to generate vCard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
