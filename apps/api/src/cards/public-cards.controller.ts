import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PublicCardsService } from './public-cards.service';

@Controller('public/cards')
export class PublicCardsController {
  constructor(private readonly publicCards: PublicCardsService) {}

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async getBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.publicCards.getBySlug(slug);
  }
}
