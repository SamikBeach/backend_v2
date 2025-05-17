import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ description: '연도별 팔로워/팔로잉 추이', type: [Object] })
  yearly: {
    year: string;
    followers: number;
    following: number;
  }[];

  @ApiProperty({
    description: '월별 팔로워/팔로잉 추이 (최근 12개월)',
    type: [Object],
  })
  monthly: {
    month: string;
    followers: number;
    following: number;
  }[];

  @ApiProperty({ description: '주별 팔로워/팔로잉 추이', type: [Object] })
  weekly: {
    week: string;
    followers: number;
    following: number;
  }[];

  @ApiProperty({
    description: '일별 팔로워/팔로잉 추이 (최근 30일)',
    type: [Object],
  })
  daily: {
    date: string;
    followers: number;
    following: number;
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
