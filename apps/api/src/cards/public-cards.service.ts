import { HttpStatus, Injectable } from '@nestjs/common';
import { CardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { toPublicCardDto } from './public-card.mapper';
import { isValidSlug, normalizeSlug } from './slug.util';

@Injectable()
export class PublicCardsService {
  constructor(private readonly prisma: PrismaService) {}

  private notFound(): never {
    throw new AppError(
      'CARD_NOT_FOUND',
      'Card not found',
      HttpStatus.NOT_FOUND,
    );
  }

  /** Published + not soft-deleted slug, or identical 404. */
  async requirePublishedSlug(rawSlug: string): Promise<string> {
    const slug = normalizeSlug(rawSlug ?? '');
    if (!isValidSlug(slug)) {
      this.notFound();
    }

    const card = await this.prisma.card.findFirst({
      where: {
        slug,
        status: CardStatus.published,
        deletedAt: null,
      },
      select: { slug: true },
    });

    if (!card) {
      this.notFound();
    }

    return card.slug;
  }

  async getBySlug(rawSlug: string) {
    const slug = await this.requirePublishedSlug(rawSlug);

    const card = await this.prisma.card.findFirst({
      where: {
        slug,
        status: CardStatus.published,
        deletedAt: null,
      },
      include: { links: true },
    });

    if (!card) {
      this.notFound();
    }

    return { card: toPublicCardDto(card) };
  }
}
