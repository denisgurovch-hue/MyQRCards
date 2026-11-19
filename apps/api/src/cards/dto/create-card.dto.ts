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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CardLinkDto } from './card-link.dto';

export class CreateCardDto {
  /** Legacy single-line name; prefer lastName + firstName. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  patronymic?: string;

  @IsOptional()
  @IsBoolean()
  showPatronymic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  photoUrl?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'coverColor must be a hex color like #0B1520',
  })
  coverColor?: string | null;

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
