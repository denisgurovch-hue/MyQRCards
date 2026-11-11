import { IsIn } from 'class-validator';
import { CONTACT_CLICK_CHANNELS } from '../analytics.channels';

export class RecordContactClickDto {
  @IsIn([...CONTACT_CLICK_CHANNELS])
  channel!: (typeof CONTACT_CLICK_CHANNELS)[number];
}
