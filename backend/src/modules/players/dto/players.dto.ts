import { IsIn, IsString, MinLength } from 'class-validator';

export class SearchPlayersDto {
  @IsString() @MinLength(2) q!: string;
}

export class LinkPlayerDto {
  @IsString() profileId!: string;
}

export class RatingHistoryQueryDto {
  @IsIn(['7d', '30d', '90d', 'all']) range: '7d' | '30d' | '90d' | 'all' = '30d';
}
