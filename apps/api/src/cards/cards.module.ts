import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from './analytics.service';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PublicCardsController } from './public-cards.controller';
import { PublicCardsService } from './public-cards.service';
import { QrCodeService } from './qr-code.service';
import { VcardService } from './vcard.service';

@Module({
  imports: [AuthModule],
  controllers: [CardsController, PublicCardsController],
  providers: [
    CardsService,
    PublicCardsService,
    QrCodeService,
    VcardService,
    AnalyticsService,
  ],
  exports: [CardsService, PublicCardsService, AnalyticsService],
})
export class CardsModule {}
