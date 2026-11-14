import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../common/errors/app-error';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { CardPhotoService } from './card-photo.service';

@Controller('media/cards')
@UseGuards(RateLimitGuard)
export class MediaController {
  constructor(private readonly photos: CardPhotoService) {}

  @Get(':storageKey')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'public, max-age=300')
  @RateLimit({
    key: 'pub:media',
    limit: 120,
    limitEnv: 'RL_PUB_MEDIA_LIMIT',
    windowSeconds: 60,
    onStorageError: 'open',
  })
  async getPhoto(
    @Param('storageKey') storageKey: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.photos.readPublicFile(storageKey);
    if (!file) {
      throw new AppError('NOT_FOUND', 'Not found', HttpStatus.NOT_FOUND);
    }
    res.setHeader('Content-Type', file.mimeType);
    return new StreamableFile(file.buffer);
  }
}
