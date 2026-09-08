import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(3) username!: string;
  @IsString() @MinLength(8) password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class SteamStartDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/)
  inviteCode?: string;
}
