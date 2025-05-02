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

// 리뷰 통계 응답 DTO
export class ReviewStatsResponseDto {
  @ApiProperty({ description: '작성한 총 리뷰 수' })
  totalReviews: number;

  @ApiProperty({ description: '월별 리뷰 작성 수', type: [Object] })
  monthlyReviewCounts: { month: string; count: number }[];

  @ApiProperty({ description: '리뷰 유형별 작성 비율', type: [Object] })
  reviewTypeDistribution: { type: string; percentage: number }[];

  @ApiProperty({ description: '리뷰당 평균 글자 수' })
  averageReviewLength: number;

  @ApiProperty({ description: '연도별 리뷰 통계', type: [Object] })
  yearly: {
    year: string;
    count: number;
  }[];

  @ApiProperty({ description: '월별 리뷰 통계 (최근 12개월)', type: [Object] })
  monthly: {
    month: string;
    count: number;
  }[];

  @ApiProperty({ description: '주간별 리뷰 통계', type: [Object] })
  weekly: {
    week: string;
    count: number;
  }[];

  @ApiProperty({ description: '일별 리뷰 통계 (최근 30일)', type: [Object] })
  daily: {
    date: string;
    count: number;
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 평점 통계 응답 DTO
export class RatingStatsResponseDto {
  @ApiProperty({ description: '평균 평점' })
  averageRating: number;

  @ApiProperty({ description: '평점 분포', type: [Object] })
  ratingDistribution: { rating: number; count: number }[];

  @ApiProperty({ description: '카테고리별 평균 평점', type: [Object] })
  categoryRatings: { category: string; averageRating: number }[];

  @ApiProperty({ description: '월별 평균 평점', type: [Object] })
  monthlyAverageRatings: { month: string; averageRating: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 액티비티 빈도 통계 응답 DTO
export class ActivityFrequencyResponseDto {
  @ApiProperty({ description: '평균 리뷰 작성 주기 (일)' })
  averageReviewInterval: number;

  @ApiProperty({ description: '평균 평점 등록 주기 (일)' })
  averageRatingInterval: number;

  @ApiProperty({ description: '독서 활동이 가장 활발한 시간대' })
  mostActiveHour: string;

  @ApiProperty({ description: '독서 활동이 가장 활발한 요일' })
  mostActiveDay: string;

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 평가 습관 통계 응답 DTO
export class RatingHabitsResponseDto {
  @ApiProperty({ description: '가장 높은 평점을 준 책', type: [Object] })
  highestRatedBooks: { title: string; author: string; rating: number }[];

  @ApiProperty({ description: '가장 낮은 평점을 준 책', type: [Object] })
  lowestRatedBooks: { title: string; author: string; rating: number }[];

  @ApiProperty({ description: '평점별 리뷰 길이 상관관계', type: [Object] })
  ratingLengthCorrelation: { rating: number; averageLength: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 사용자 상호작용 통계 응답 DTO
export class UserInteractionResponseDto {
  @ApiProperty({ description: '받은 좋아요 총계' })
  totalLikesReceived: number;

  @ApiProperty({ description: '받은 댓글 총계' })
  totalCommentsReceived: number;

  @ApiProperty({ description: '작성한 댓글 총계' })
  totalCommentsCreated: number;

  @ApiProperty({ description: '준 좋아요 총계' })
  totalLikesGiven: number;

  @ApiProperty({ description: '인게이지먼트 비율 (%)' })
  engagementRate: number;

  @ApiProperty({ description: '연도별 받은 좋아요 수', type: [Object] })
  yearlyLikesReceived: { year: string; count: number }[];

  @ApiProperty({ description: '월별 받은 좋아요 수', type: [Object] })
  monthlyLikesReceived: { month: string; count: number }[];

  @ApiProperty({ description: '주별 받은 좋아요 수', type: [Object] })
  weeklyLikesReceived: { week: string; count: number }[];

  @ApiProperty({ description: '일별 받은 좋아요 수', type: [Object] })
  dailyLikesReceived: { date: string; count: number }[];

  @ApiProperty({ description: '연도별 받은 댓글 수', type: [Object] })
  yearlyCommentsReceived: { year: string; count: number }[];

  @ApiProperty({ description: '월별 받은 댓글 수', type: [Object] })
  monthlyCommentsReceived: { month: string; count: number }[];

  @ApiProperty({ description: '주별 받은 댓글 수', type: [Object] })
  weeklyCommentsReceived: { week: string; count: number }[];

  @ApiProperty({ description: '일별 받은 댓글 수', type: [Object] })
  dailyCommentsReceived: { date: string; count: number }[];

  @ApiProperty({ description: '연도별 작성한 댓글 수', type: [Object] })
  yearlyCommentsCreated: { year: string; count: number }[];

  @ApiProperty({ description: '월별 작성한 댓글 수', type: [Object] })
  monthlyCommentsCreated: { month: string; count: number }[];

  @ApiProperty({ description: '주별 작성한 댓글 수', type: [Object] })
  weeklyCommentsCreated: { week: string; count: number }[];

  @ApiProperty({ description: '일별 작성한 댓글 수', type: [Object] })
  dailyCommentsCreated: { date: string; count: number }[];

  @ApiProperty({ description: '연도별 준 좋아요 수', type: [Object] })
  yearlyLikesGiven: { year: string; count: number }[];

  @ApiProperty({ description: '월별 준 좋아요 수', type: [Object] })
  monthlyLikesGiven: { month: string; count: number }[];

  @ApiProperty({ description: '주별 준 좋아요 수', type: [Object] })
  weeklyLikesGiven: { week: string; count: number }[];

  @ApiProperty({ description: '일별 준 좋아요 수', type: [Object] })
  dailyLikesGiven: { date: string; count: number }[];

  @ApiProperty({ description: '월별 받은 좋아요 수', type: [Object] })
  monthlyLikes: { month: string; count: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 팔로워/팔로잉 통계 응답 DTO
export class FollowerStatsResponseDto {
  @ApiProperty({ description: '팔로워 수' })
  followersCount: number;

  @ApiProperty({ description: '팔로잉 수' })
  followingCount: number;

  @ApiProperty({ description: '팔로워 증가 추이', type: [Object] })
  followerGrowth: { date: string; count: number }[];

  @ApiProperty({ description: '연도별 팔로워 추이', type: [Object] })
  yearly: {
    year: string;
    count: number;
  }[];

  @ApiProperty({
    description: '월별 팔로워 추이 (최근 12개월)',
    type: [Object],
  })
  monthly: {
    month: string;
    count: number;
  }[];

  @ApiProperty({ description: '주별 팔로워 추이', type: [Object] })
  weekly: {
    week: string;
    count: number;
  }[];

  @ApiProperty({ description: '일별 팔로워 추이 (최근 30일)', type: [Object] })
  daily: {
    date: string;
    count: number;
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 커뮤니티 활동 통계 응답 DTO
export class CommunityActivityResponseDto {
  @ApiProperty({ description: '작성한 총 리뷰 수' })
  totalReviews: number;

  @ApiProperty({ description: '연도별 리뷰 타입별 통계', type: [Object] })
  yearly: {
    year: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[];

  @ApiProperty({
    description: '월별 리뷰 타입별 통계 (최근 12개월)',
    type: [Object],
  })
  monthly: {
    month: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[];

  @ApiProperty({ description: '주별 리뷰 타입별 통계', type: [Object] })
  weekly: {
    week: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[];

  @ApiProperty({
    description: '일별 리뷰 타입별 통계 (최근 30일)',
    type: [Object],
  })
  daily: {
    date: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

// 리뷰 영향력 통계 응답 DTO
export class ReviewInfluenceResponseDto {
  @ApiProperty({ description: '리뷰당 평균 좋아요 수' })
  averageLikesPerReview: number;

  @ApiProperty({ description: '가장 인기 있는 리뷰', type: [Object] })
  popularReviews: { id: number; content: string; likes: number }[];

  @ApiProperty({ description: '커뮤니티 기여도 점수' })
  communityContributionScore: number;

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}

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

// 사용자의 독서 시간 패턴 통계 응답 DTO
export class ReadingTimePatternResponseDto {
  @ApiProperty({
    description: '하루 중 독서를 가장 많이 하는 시간대',
    example: ['아침 (6-9시)', '저녁 (18-21시)'],
  })
  peakReadingHours: string[];

  @ApiProperty({
    description: '주간 평균 독서 시간 (시간)',
    example: 7.5,
  })
  weeklyAverageReadingHours: number;

  @ApiProperty({
    description: '월간 평균 독서 시간 (시간)',
    example: 30,
  })
  monthlyAverageReadingHours: number;

  @ApiProperty({
    description: '독서 지속 시간 분석 (한 번에 읽는 평균 시간)',
    example: '45분',
  })
  averageSessionDuration: string;

  @ApiProperty({
    description: '요일별 독서 시간 분포',
    example: [
      { day: '월요일', hours: 1.2 },
      { day: '화요일', hours: 0.8 },
      { day: '수요일', hours: 1.5 },
      { day: '목요일', hours: 0.9 },
      { day: '금요일', hours: 0.7 },
      { day: '토요일', hours: 1.8 },
      { day: '일요일', hours: 2.1 },
    ],
  })
  dayOfWeekDistribution: { day: string; hours: number }[];

  @ApiProperty({
    description: '계절별 독서 시간 분포',
    example: [
      { season: '봄', hours: 35 },
      { season: '여름', hours: 28 },
      { season: '가을', hours: 42 },
      { season: '겨울', hours: 45 },
    ],
  })
  seasonalDistribution: { season: string; hours: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}
