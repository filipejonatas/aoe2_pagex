import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LeagueVisibility } from '@prisma/client';

export class CreateLeagueDto {
  @IsString() @MinLength(3) @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  @IsEnum(LeagueVisibility) visibility!: LeagueVisibility;
  @IsOptional() @Type(() => Number) @IsIn([3, 4]) leaderboardId = 3;
}

export class JoinLeagueDto {
  @IsString() @MinLength(6) inviteCode!: string;
}

export class AddLeaguePlayerDto {
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @Matches(/^\d+$/)
  @MaxLength(20)
  profileId!: string;
}

export class LeagueLeaderboardQueryDto {
  @IsOptional() @Type(() => Number) @IsIn([3, 4]) leaderboardId?: number;
}
