import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CardLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsUrl({ require_protocol: true }, { message: 'url must be http(s)' })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
