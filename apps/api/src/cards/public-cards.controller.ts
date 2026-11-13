import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { RecordContactClickDto } from './dto/record-contact-click.dto';
import { toPublicCardDto } from './public-card.mapper';
import { PublicCardsService } from './public-cards.service';
import { QrCodeService } from './qr-code.service';
import { resolveVcardDisposition } from './vcard-disposition';
import { VcardService } from './vcard.service';

@Controller('public/cards')
export class PublicCardsController {
  constructor(
    private readonly publicCards: PublicCardsService,
    private readonly qrCodes: QrCodeService,
    private readonly vcards: VcardService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post(':slug/clicks')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async recordClick(
    @Param('slug') slug: string,
    @Body() dto: RecordContactClickDto,
  ): Promise<void> {
    await this.analytics.recordContactClickBySlug(slug, dto.channel);
  }

  @Get(':slug/vcard')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async getVcard(
    @Param('slug') slug: string,
    @Query('download') download: string | string[] | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const disposition = resolveVcardDisposition(download);
    const { body, filename, cardId } = await this.vcards.generate(slug);
    this.analytics.recordVcardDownload(cardId);
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(Buffer.from(body, 'utf8'));
  }

  @Get(':slug/qr.png')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async getQrPng(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.qrCodes.generatePng(slug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(buffer);
  }

  @Get(':slug/qr.svg')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async getQrSvg(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { svg, filename } = await this.qrCodes.generateSvg(slug);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(Buffer.from(svg, 'utf8'));
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async getBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const card = await this.publicCards.getPublishedCard(slug);
    this.analytics.recordCardView(card.id);
    return { card: toPublicCardDto(card) };
  }
}
