import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { PublicCardsService } from './public-cards.service';
import { QrCodeService } from './qr-code.service';
import { VcardService } from './vcard.service';

@Controller('public/cards')
export class PublicCardsController {
  constructor(
    private readonly publicCards: PublicCardsService,
    private readonly qrCodes: QrCodeService,
    private readonly vcards: VcardService,
  ) {}

  @Get(':slug/vcard')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async getVcard(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { body, filename } = await this.vcards.generate(slug);
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
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
    return this.publicCards.getBySlug(slug);
  }
}
