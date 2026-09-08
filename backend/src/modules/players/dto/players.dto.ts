import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchPlayersDto {
  @IsString() @MinLength(2) q!: string;
}

export class LinkPlayerDto {
  @IsString() profileId!: string;
}

export class RatingHistoryQueryDto {
  @IsIn(['7d', '30d', '90d', 'all']) range: '7d' | '30d' | '90d' | 'all' = '30d';
}

export class GlobalLeaderboardQueryDto {
  @Type(() => Number) @IsIn([3, 4]) leaderboardId: 3 | 4 = 3;
  @IsOptional() @Transform(({ value }) => String(value).trim().toLowerCase()) @Matches(/^[a-z]{2}$/) country?: string;
  @IsOptional() @Transform(({ value }) => String(value).trim()) @IsString() @MinLength(2) @MaxLength(80) search?: string;
  @IsOptional() @IsString() @MaxLength(512) cursor?: string;
  @Type(() => Number) @IsInt() @Min(10) @Max(100) limit = 50;
}
