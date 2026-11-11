import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PublicCardsController } from './public-cards.controller';
import { PublicCardsService } from './public-cards.service';

@Module({
  imports: [AuthModule],
  controllers: [CardsController, PublicCardsController],
  providers: [CardsService, PublicCardsService],
  exports: [CardsService, PublicCardsService],
})
export class CardsModule {}
