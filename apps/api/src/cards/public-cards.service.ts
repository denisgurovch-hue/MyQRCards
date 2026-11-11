import { HttpStatus, Injectable } from '@nestjs/common';
import { CardStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { toPublicCardDto } from './public-card.mapper';
import { isValidSlug, normalizeSlug } from './slug.util';

@Injectable()
export class PublicCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(rawSlug: string) {
    const slug = normalizeSlug(rawSlug ?? '');
    if (!isValidSlug(slug)) {
      throw new AppError(
        'CARD_NOT_FOUND',
        'Card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const card = await this.prisma.card.findFirst({
      where: {
        slug,
        status: CardStatus.published,
        deletedAt: null,
      },
      include: { links: true },
    });

    if (!card) {
      throw new AppError(
        'CARD_NOT_FOUND',
        'Card not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return { card: toPublicCardDto(card) };
  }
}
