import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from './analytics.service';
import { CardPhotoService } from './card-photo.service';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { MediaController } from './media.controller';
import { PublicCardsController } from './public-cards.controller';
import { PublicCardsService } from './public-cards.service';
import { QrCodeService } from './qr-code.service';
import { VcardService } from './vcard.service';

@Module({
  imports: [AuthModule],
  controllers: [CardsController, PublicCardsController, MediaController],
  providers: [
    CardsService,
    PublicCardsService,
    QrCodeService,
    VcardService,
    AnalyticsService,
    CardPhotoService,
  ],
  exports: [CardsService, PublicCardsService, AnalyticsService, CardPhotoService],
})
export class CardsModule {}
