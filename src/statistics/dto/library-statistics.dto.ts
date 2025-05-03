import { ApiProperty } from '@nestjs/swagger';

// 서재 구성 통계 응답 DTO
export class LibraryCompositionResponseDto {
  @ApiProperty({ description: '생성한 서재 수' })
  totalLibraries: number;

  @ApiProperty({ description: '서재별 도서 수', type: [Object] })
  booksPerLibrary: { name: string; count: number }[];

  @ApiProperty({ description: '서재별 태그 분포', type: [Object] })
  tagsDistribution: {
    library: string;
    tags: { tag: string; count: number }[];
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 서재 인기도 통계 응답 DTO
export class LibraryPopularityResponseDto {
  @ApiProperty({ description: '서재별 구독자 수', type: [Object] })
  subscribersPerLibrary: { library: string; subscribers: number }[];

  @ApiProperty({ description: '가장 인기 있는 서재' })
  mostPopularLibrary: string;

  @ApiProperty({ description: '서재 인기도 추이', type: [Object] })
  popularityTrend: {
    library: string;
    trend: { date: string; subscribers: number }[];
  }[];

  @ApiProperty({
    description: '연도별 상위 5개 서재의 구독자 추세',
    type: [Object],
  })
  yearly: {
    year: string;
    libraries: { library: string; subscribers: number }[];
  }[];

  @ApiProperty({
    description: '월별 상위 5개 서재의 구독자 추세 (최근 5개월)',
    type: [Object],
  })
  monthly: {
    month: string;
    libraries: { library: string; subscribers: number }[];
  }[];

  @ApiProperty({
    description: '주별 상위 5개 서재의 구독자 추세 (최근 5주)',
    type: [Object],
  })
  weekly: {
    week: string;
    libraries: { library: string; subscribers: number }[];
  }[];

  @ApiProperty({
    description: '일별 상위 5개 서재의 구독자 추세 (최근 5일)',
    type: [Object],
  })
  daily: {
    date: string;
    libraries: { library: string; subscribers: number }[];
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 서재 업데이트 패턴 통계 응답 DTO
export class LibraryUpdatePatternResponseDto {
  @ApiProperty({ description: '서재별 업데이트 빈도', type: [Object] })
  updateFrequency: { library: string; updatesPerMonth: number }[];

  @ApiProperty({ description: '업데이트가 가장 활발한 서재' })
  mostActiveLibrary: string;

  @ApiProperty({ description: '요일별 서재 활동', type: [Object] })
  weekdayActivity: { day: string; count: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}
