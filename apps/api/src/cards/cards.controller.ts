import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CardsService } from './cards.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
@UseGuards(AuthGuard)
export class CardsController {
  constructor(
    private readonly cards: CardsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCardDto,
  ) {
    return this.cards.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cards.list(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: string,
  ) {
    return this.analytics.getForOwner(user.id, id, period);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cards.getOwned(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cards.update(user.id, id, dto);
  }

  @Post(':id/publish')
  publish(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cards.publish(user.id, id);
  }

  @Post(':id/unpublish')
  unpublish(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cards.unpublish(user.id, id);
  }

  @Post(':id/archive')
  archive(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cards.archive(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.cards.softDelete(user.id, id);
  }
}
