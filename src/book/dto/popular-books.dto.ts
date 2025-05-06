import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PopularBooksSortOptions {
  RATING_DESC = 'rating-desc',
  REVIEWS_DESC = 'reviews-desc',
  LIBRARY_COUNT_DESC = 'library-desc',
  PUBLISH_DATE_DESC = 'publishDate-desc',
  TITLE_ASC = 'title-asc',
}

export enum TimeRangeOptions {
  ALL = 'all',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class PopularBooksRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  subcategoryId?: number;

  @IsOptional()
  @IsEnum(PopularBooksSortOptions)
  sort?: PopularBooksSortOptions = PopularBooksSortOptions.RATING_DESC;

  @IsOptional()
  @IsEnum(TimeRangeOptions)
  timeRange?: TimeRangeOptions = TimeRangeOptions.ALL;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  userId?: string;
}
