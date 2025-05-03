import { ApiProperty } from '@nestjs/swagger';

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
