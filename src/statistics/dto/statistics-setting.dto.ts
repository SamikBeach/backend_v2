import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStatisticsSettingDto {
  @ApiProperty({
    description: '독서 상태별 도서 수 통계 공개 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isReadingStatusPublic?: boolean;

  @ApiProperty({
    description: '기간별 독서 상태 통계 공개 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isReadingStatusByPeriodPublic?: boolean;

  @ApiProperty({
    description: '장르/카테고리 분석 통계 공개 여부',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isGenreAnalysisPublic?: boolean;

  @ApiProperty({ description: '저자/출판사 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isAuthorPublisherStatsPublic?: boolean;

  @ApiProperty({ description: '리뷰 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isReviewStatsPublic?: boolean;

  @ApiProperty({ description: '평점 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isRatingStatsPublic?: boolean;

  @ApiProperty({ description: '액티비티 빈도 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isActivityFrequencyPublic?: boolean;

  @ApiProperty({ description: '평가 습관 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isRatingHabitsPublic?: boolean;

  @ApiProperty({
    description: '사용자 상호작용 통계 공개 여부',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isUserInteractionPublic?: boolean;

  @ApiProperty({ description: '팔로워/팔로잉 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isFollowerStatsPublic?: boolean;

  @ApiProperty({ description: '커뮤니티 활동 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isCommunityActivityPublic?: boolean;

  @ApiProperty({ description: '리뷰 영향력 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isReviewInfluencePublic?: boolean;

  @ApiProperty({ description: '서재 구성 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isLibraryCompositionPublic?: boolean;

  @ApiProperty({ description: '서재 인기도 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isLibraryPopularityPublic?: boolean;

  @ApiProperty({
    description: '서재 업데이트 패턴 통계 공개 여부',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isLibraryUpdatePatternPublic?: boolean;

  @ApiProperty({ description: '검색 활동 통계 공개 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isSearchActivityPublic?: boolean;
}

export class StatisticsSettingResponseDto {
  @ApiProperty({ description: '독서 상태별 도서 수 통계 공개 여부' })
  isReadingStatusPublic: boolean;

  @ApiProperty({ description: '기간별 독서 상태 통계 공개 여부' })
  isReadingStatusByPeriodPublic: boolean;

  @ApiProperty({ description: '장르/카테고리 분석 통계 공개 여부' })
  isGenreAnalysisPublic: boolean;

  @ApiProperty({ description: '저자/출판사 통계 공개 여부' })
  isAuthorPublisherStatsPublic: boolean;

  @ApiProperty({ description: '리뷰 통계 공개 여부' })
  isReviewStatsPublic: boolean;

  @ApiProperty({ description: '평점 통계 공개 여부' })
  isRatingStatsPublic: boolean;

  @ApiProperty({ description: '액티비티 빈도 통계 공개 여부' })
  isActivityFrequencyPublic: boolean;

  @ApiProperty({ description: '평가 습관 통계 공개 여부' })
  isRatingHabitsPublic: boolean;

  @ApiProperty({ description: '사용자 상호작용 통계 공개 여부' })
  isUserInteractionPublic: boolean;

  @ApiProperty({ description: '팔로워/팔로잉 통계 공개 여부' })
  isFollowerStatsPublic: boolean;

  @ApiProperty({ description: '커뮤니티 활동 통계 공개 여부' })
  isCommunityActivityPublic: boolean;

  @ApiProperty({ description: '리뷰 영향력 통계 공개 여부' })
  isReviewInfluencePublic: boolean;

  @ApiProperty({ description: '서재 구성 통계 공개 여부' })
  isLibraryCompositionPublic: boolean;

  @ApiProperty({ description: '서재 인기도 통계 공개 여부' })
  isLibraryPopularityPublic: boolean;

  @ApiProperty({ description: '서재 업데이트 패턴 통계 공개 여부' })
  isLibraryUpdatePatternPublic: boolean;

  @ApiProperty({ description: '검색 활동 통계 공개 여부' })
  isSearchActivityPublic: boolean;
}
