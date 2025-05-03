import { ApiProperty } from '@nestjs/swagger';

// 독서 상태별 도서 수 통계 응답 DTO
export class ReadingStatusStatsResponseDto {
  @ApiProperty({ description: '읽고 싶은 책 수' })
  wantToReadCount: number;

  @ApiProperty({ description: '읽는 중인 책 수' })
  readingCount: number;

  @ApiProperty({ description: '읽은 책 수' })
  readCount: number;

  @ApiProperty({ description: '완독률 (%)' })
  completionRate: number;

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 기간별 읽기 상태 통계 응답 DTO
export class ReadingStatusByPeriodResponseDto {
  @ApiProperty({ description: '연도별 독서 상태 통계', type: [Object] })
  yearly: {
    year: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[];

  @ApiProperty({
    description: '월별 독서 상태 통계 (최근 12개월)',
    type: [Object],
  })
  monthly: {
    month: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[];

  @ApiProperty({
    description: '주간별 독서 상태 통계 (n월 m째주 형식)',
    type: [Object],
    example: [
      { week: '5월 1째주', wantToReadCount: 2, readingCount: 1, readCount: 3 },
      { week: '5월 2째주', wantToReadCount: 1, readingCount: 2, readCount: 1 },
    ],
  })
  weekly: {
    week: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[];

  @ApiProperty({
    description: '일별 독서 상태 통계 (최근 30일)',
    type: [Object],
  })
  daily: {
    date: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 장르/카테고리 분석 통계 응답 DTO
export class GenreAnalysisResponseDto {
  @ApiProperty({ description: '카테고리별 읽은 책 수', type: [Object] })
  categoryCounts: { category: string; count: number }[];

  @ApiProperty({ description: '서브카테고리별 읽은 책 수', type: [Object] })
  subCategoryCounts: { subCategory: string; count: number }[];

  @ApiProperty({ description: '가장 많이 읽은 카테고리' })
  mostReadCategory: string;

  @ApiProperty({ description: '연도별 카테고리 통계', type: [Object] })
  yearly: {
    year: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[];

  @ApiProperty({ description: '월별 카테고리 통계', type: [Object] })
  monthly: {
    month: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[];

  @ApiProperty({ description: '주별 카테고리 통계', type: [Object] })
  weekly: {
    week: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[];

  @ApiProperty({ description: '일별 카테고리 통계', type: [Object] })
  daily: {
    date: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 저자/출판사 통계 응답 DTO
export class AuthorPublisherStatsResponseDto {
  @ApiProperty({ description: '가장 많이 읽은 저자 TOP 5', type: [Object] })
  topAuthors: { author: string; count: number }[];

  @ApiProperty({ description: '가장 많이 읽은 출판사 TOP 5', type: [Object] })
  topPublishers: { publisher: string; count: number }[];

  @ApiProperty({ description: '출판년도별 읽은 책 분포', type: [Object] })
  publishYearDistribution: { year: string; count: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}
