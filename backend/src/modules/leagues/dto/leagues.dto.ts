import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LeagueVisibility } from '@prisma/client';

export class CreateLeagueDto {
  @IsString() @MinLength(3) @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  @IsEnum(LeagueVisibility) visibility!: LeagueVisibility;
}

export class JoinLeagueDto {
  @IsString() @MinLength(6) inviteCode!: string;
}
