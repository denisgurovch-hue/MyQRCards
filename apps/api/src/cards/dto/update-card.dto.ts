import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardLinkDto } from './card-link.dto';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  photoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, digits and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CardLinkDto)
  links?: CardLinkDto[];
}
