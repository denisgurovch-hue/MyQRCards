import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardLinkDto } from './dto/card-link.dto';
import { toCardResponse } from './cards.mapper';
import {
  isValidSlug,
  normalizeSlug,
  slugifyFromName,
} from './slug.util';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCardDto) {
    const slug = await this.resolveSlug(dto.slug, dto.displayName);

    try {
      const card = await this.prisma.$transaction(async (tx) => {
        const created = await tx.card.create({
          data: {
            userId,
            displayName: dto.displayName.trim(),
            jobTitle: dto.jobTitle?.trim() || null,
            companyName: dto.companyName?.trim() || null,
            summary: dto.summary?.trim() || null,
            phone: dto.phone?.trim() || null,
            email: dto.email?.trim().toLowerCase() || null,
            showEmail: dto.showEmail ?? false,
            websiteUrl: dto.websiteUrl || null,
            photoUrl: dto.photoUrl || null,
            slug,
            status: CardStatus.draft,
            links: {
              create: this.mapLinks(dto.links),
            },
          },
          include: { links: true },
        });
        return created;
      });

      this.logger.log('Card created');
      return { card: toCardResponse(card) };
    } catch (error) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  async list(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = { userId, deletedAt: null };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.card.count({ where }),
      this.prisma.card.findMany({
        where,
        include: { links: true },
        orderBy: { updatedAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return {
      items: items.map(toCardResponse),
      page: safePage,
      limit: safeLimit,
      total,
    };
  }

  async getOwned(userId: string, cardId: string) {
    const card = await this.findOwnedOrThrow(userId, cardId);
    return { card: toCardResponse(card) };
  }

  async update(userId: string, cardId: string, dto: UpdateCardDto) {
    await this.findOwnedOrThrow(userId, cardId);

    const data: Prisma.CardUpdateInput = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim();
    }
    if (dto.jobTitle !== undefined) {
      data.jobTitle = dto.jobTitle?.trim() || null;
    }
    if (dto.companyName !== undefined) {
      data.companyName = dto.companyName?.trim() || null;
    }
    if (dto.summary !== undefined) {
      data.summary = dto.summary?.trim() || null;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
    }
    if (dto.email !== undefined) {
      data.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.showEmail !== undefined) {
      data.showEmail = dto.showEmail;
    }
    if (dto.websiteUrl !== undefined) {
      data.websiteUrl = dto.websiteUrl || null;
    }
    if (dto.photoUrl !== undefined) {
      data.photoUrl = dto.photoUrl || null;
    }
    if (dto.slug !== undefined) {
      const slug = normalizeSlug(dto.slug);
      if (!isValidSlug(slug)) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Invalid slug format',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.slug = slug;
    }

    try {
      const card = await this.prisma.$transaction(async (tx) => {
        if (dto.links) {
          await tx.cardLink.deleteMany({
            where: { cardId, card: { userId, deletedAt: null } },
          });
          await tx.cardLink.createMany({
            data: this.mapLinks(dto.links).map((link) => ({
              ...link,
              cardId,
            })),
          });
        }

        const updated = await tx.card.updateMany({
          where: { id: cardId, userId, deletedAt: null },
          data,
        });
        if (updated.count === 0) {
          throw new AppError(
            'NOT_FOUND',
            'Card not found',
            HttpStatus.NOT_FOUND,
          );
        }

        return tx.card.findFirstOrThrow({
          where: { id: cardId, userId, deletedAt: null },
          include: { links: true },
        });
      });

      this.logger.log('Card updated');
      return { card: toCardResponse(card) };
    } catch (error) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  async publish(userId: string, cardId: string) {
    return this.setStatus(userId, cardId, CardStatus.published);
  }

  async unpublish(userId: string, cardId: string) {
    return this.setStatus(userId, cardId, CardStatus.draft);
  }

  async archive(userId: string, cardId: string) {
    return this.setStatus(userId, cardId, CardStatus.archived);
  }

  async softDelete(userId: string, cardId: string) {
    const updated = await this.prisma.card.updateMany({
      where: { id: cardId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Card not found', HttpStatus.NOT_FOUND);
    }
    this.logger.log('Card soft-deleted');
  }

  private async setStatus(
    userId: string,
    cardId: string,
    status: CardStatus,
  ) {
    const updated = await this.prisma.card.updateMany({
      where: { id: cardId, userId, deletedAt: null },
      data: { status },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Card not found', HttpStatus.NOT_FOUND);
    }
    const card = await this.prisma.card.findFirstOrThrow({
      where: { id: cardId, userId, deletedAt: null },
      include: { links: true },
    });
    this.logger.log('Card status changed');
    return { card: toCardResponse(card) };
  }



  private async findOwnedOrThrow(userId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, userId, deletedAt: null },
      include: { links: true },
    });
    if (!card) {
      throw new AppError('NOT_FOUND', 'Card not found', HttpStatus.NOT_FOUND);
    }
    return card;
  }

  private async resolveSlug(
    requested: string | undefined,
    displayName: string,
  ): Promise<string> {
    if (requested) {
      const slug = normalizeSlug(requested);
      if (!isValidSlug(slug)) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Invalid slug format',
          HttpStatus.BAD_REQUEST,
        );
      }
      const exists = await this.prisma.card.findUnique({ where: { slug } });
      if (exists) {
        throw new AppError(
          'SLUG_ALREADY_EXISTS',
          'This slug is already taken',
          HttpStatus.CONFLICT,
        );
      }
      return slug;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = slugifyFromName(displayName);
      const exists = await this.prisma.card.findUnique({
        where: { slug: candidate },
      });
      if (!exists) {
        return candidate;
      }
    }

    throw new AppError(
      'SLUG_ALREADY_EXISTS',
      'Unable to generate a unique slug',
      HttpStatus.CONFLICT,
    );
  }

  private mapLinks(links: CardLinkDto[] | undefined) {
    if (!links?.length) {
      return [];
    }
    return links.map((link, index) => ({
      label: link.label?.trim() || null,
      url: link.url,
      type: link.type?.trim() || null,
      position: link.position ?? index,
    }));
  }

  private rethrowSlugConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        'SLUG_ALREADY_EXISTS',
        'This slug is already taken',
        HttpStatus.CONFLICT,
      );
    }
  }
}
