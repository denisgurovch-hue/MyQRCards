import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  /** Opaque refresh token when cookies are unavailable (native clients). */
  @IsOptional()
  @IsString()
  @MinLength(16)
  refreshToken?: string;
}
