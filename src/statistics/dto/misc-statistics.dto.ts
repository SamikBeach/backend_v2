import { ApiProperty } from '@nestjs/swagger';

// 검색 활동 통계 응답 DTO
export class SearchActivityResponseDto {
  @ApiProperty({ description: '검색 횟수' })
  searchCount: number;

  @ApiProperty({ description: '가장 많이 검색한 키워드', type: [Object] })
  topSearchTerms: { term: string; count: number }[];

  @ApiProperty({ description: '자주 검색하는 키워드 TOP 10', type: [Object] })
  frequentlySearchedTerms: { term: string; count: number }[];

  @ApiProperty({ description: '검색 패턴 분석' })
  searchPattern: string;

  @ApiProperty({ description: '연도별 검색 통계', type: [Object] })
  yearly: { year: string; count: number }[];

  @ApiProperty({ description: '월별 검색 통계 (최근 12개월)', type: [Object] })
  monthly: { month: string; count: number }[];

  @ApiProperty({ description: '주별 검색 통계', type: [Object] })
  weekly: { week: string; count: number }[];

  @ApiProperty({ description: '일별 검색 통계 (최근 30일)', type: [Object] })
  daily: { date: string; count: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

/**
 * 인기 검색어 통계 DTO
 */
export class PopularSearchStatsResponseDto {
  /**
   * 인기 검색어 목록
   * @example [{ term: '해리 포터', count: 120 }, { term: '햄릿', count: 85 }]
   */
  @ApiProperty({
    description: '인기 검색어 목록',
    example: [
      { term: '해리 포터', count: 120 },
      { term: '햄릿', count: 85 },
    ],
  })
  popularSearches: { term: string; count: number }[];

  /**
   * 인기 검색어의 총 검색 횟수
   * @example 1240
   */
  @ApiProperty({
    description: '인기 검색어의 총 검색 횟수',
    example: 1240,
  })
  totalSearchCount: number;

  /**
   * 해당 통계의 공개 여부
   * @example true
   */
  @ApiProperty({
    description: '해당 통계의 공개 여부',
    example: true,
  })
  isPublic: boolean;
}

/**
 * 최근 인기 검색어 DTO
 */
export class RecentPopularSearchDto {
  /**
   * 검색어
   * @example '해리 포터'
   */
  @ApiProperty({
    description: '검색어',
    example: '해리 포터',
  })
  term: string;

  /**
   * 검색 횟수
   * @example 120
   */
  @ApiProperty({
    description: '검색 횟수',
    example: 120,
  })
  count: number;
}
