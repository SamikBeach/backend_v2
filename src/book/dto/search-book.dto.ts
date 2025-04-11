import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsBoolean,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'Keyword',
  TITLE = 'Title',
  AUTHOR = 'Author',
  PUBLISHER = 'Publisher',
  ISBN = 'ISBN',
}

export enum SearchTarget {
  BOOK = 'Book',
  FOREIGN = 'Foreign',
  MUSIC = 'Music',
  DVD = 'DVD',
  USED = 'Used',
  EBOOK = 'eBook',
  ALL = 'All',
}

export enum SortType {
  ACCURACY = 'Accuracy',
  PUBLISH_TIME = 'PublishTime',
  TITLE = 'Title',
  SALES_POINT = 'SalesPoint',
  CUSTOMER_RATING = 'CustomerRating',
}

export enum CoverSize {
  BIG = 'Big',
  MID_BIG = 'MidBig',
  MID = 'Mid',
  SMALL = 'Small',
  MINI = 'Mini',
  NONE = 'None',
}

export class SearchBookDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @IsOptional()
  @IsEnum(SearchTarget)
  searchTarget?: SearchTarget = SearchTarget.BOOK;

  @IsOptional()
  @IsEnum(SortType)
  sort?: SortType = SortType.ACCURACY;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsEnum(CoverSize)
  cover?: CoverSize = CoverSize.BIG;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  outOfStockFilter?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  recentPublishFilter?: number = 0;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optResult?: string[];
}

export class SearchResultDto {
  items: any[];
  total: number;
  page: number;
  totalPages: number;
}

export class RecentSearchDto {
  terms: string[];
  count: number;
}

export class PopularSearchDto {
  term: string;
  count: number;
}
