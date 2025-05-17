import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import { Review } from '../../review/entities/review.entity';
import { User } from '../../user/entities/user.entity';
import { UserFollower } from '../../user/entities/user-follower.entity';
import { Comment } from '../../review/entities/comment.entity';
import { ReviewLike } from '../../review/entities/review-like.entity';
import {
  UserInteractionResponseDto,
  FollowerStatsResponseDto,
  CommunityActivityResponseDto,
  ReviewInfluenceResponseDto,
} from '../dto/community-activity-statistics.dto';

@Injectable()
export class CommunityActivityStatisticsService {
  private readonly logger = new Logger(CommunityActivityStatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserFollower)
    private readonly userFollowerRepository: Repository<UserFollower>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(ReviewLike)
    private readonly reviewLikeRepository: Repository<ReviewLike>,
  ) {}

  // Helper method: get or create user statistics setting
  private async getOrCreateUserStatisticsSetting(
    userId: number,
  ): Promise<UserStatisticsSetting> {
    try {
      let setting = await this.userStatisticsSettingRepository.findOne({
        where: { userId },
      });

      if (!setting) {
        setting = this.userStatisticsSettingRepository.create({ userId });
        await this.userStatisticsSettingRepository.save(setting);
      }

      return setting;
    } catch (error) {
      this.logger.error(`통계 설정 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // Helper method: format date
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper methods for data merging
  private mergeAndSortData<T>(
    emptyData: T[],
    actualData: T[],
    key: string,
    limit: number,
  ): T[] {
    // 빈 데이터와 실제 데이터 맵 생성
    const dataMap: Record<string, T> = {};
    emptyData.forEach((item) => {
      dataMap[item[key]] = { ...item };
    });

    // 실제 데이터 병합
    actualData.forEach((item) => {
      if (dataMap[item[key]]) {
        dataMap[item[key]] = { ...dataMap[item[key]], ...item };
      } else {
        dataMap[item[key]] = { ...item };
      }
    });

    // 키 기준 정렬하고 최근 limit개만 반환
    return Object.values(dataMap)
      .sort((a, b) => (a[key] < b[key] ? -1 : 1))
      .slice(-limit);
  }

  // Helper method for merging weekly data
  private mergeWeeklyData(
    emptyData: { week: string; count: number }[],
    actualData: { week: string; count: number }[],
    limit: number,
  ): { week: string; count: number }[] {
    // 실제 데이터가 비어있으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData;
    }

    // 각 주차별 데이터를 객체로 변환
    const dataMap = new Map();

    // 빈 데이터 먼저 맵에 등록
    emptyData.forEach((item) => {
      dataMap.set(item.week, item.count);
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      dataMap.set(item.week, item.count);
    });

    // 맵을 배열로 변환하여 반환
    const result = Array.from(dataMap).map(([week, count]) => ({
      week,
      count,
    }));

    // 주차 정보로 정렬 (최신 주 데이터가 먼저 오도록 역순 정렬)
    result.sort((a, b) => {
      const aMonth = parseInt(a.week.split('월')[0]);
      const bMonth = parseInt(b.week.split('월')[0]);

      if (aMonth !== bMonth) return bMonth - aMonth; // 월이 큰 것이 먼저 오도록

      const aWeek = parseInt(a.week.split('째주')[0].split('월 ')[1]);
      const bWeek = parseInt(b.week.split('째주')[0].split('월 ')[1]);

      return bWeek - aWeek; // 주차가 큰 것이 먼저 오도록
    });

    // 최대 limit 개수만 반환
    return result.slice(0, limit);
  }

  // Helper for merging community data
  private mergeAndSortCommunityData(
    emptyData: any[],
    actualData: any[],
    keyField: string,
    limit: number,
  ): any[] {
    // 실제 데이터가 없으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData.slice(0, limit);
    }

    // keyField 값을 기준으로 데이터 맵 생성
    const dataMap = new Map();

    // 빈 데이터를 먼저 맵에 추가
    emptyData.forEach((item) => {
      dataMap.set(item[keyField], { ...item });
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      if (dataMap.has(item[keyField])) {
        const existingItem = dataMap.get(item[keyField]);
        dataMap.set(item[keyField], {
          ...existingItem,
          general: item.general,
          discussion: item.discussion,
          question: item.question,
          meetup: item.meetup,
        });
      } else {
        dataMap.set(item[keyField], { ...item });
      }
    });

    // 맵을 배열로 변환
    const result = Array.from(dataMap.values());

    // keyField 값으로 정렬 (내림차순: 최신 데이터가 먼저)
    result.sort((a, b) => {
      if (a[keyField] > b[keyField]) return -1;
      if (a[keyField] < b[keyField]) return 1;
      return 0;
    });

    // 데이터 개수 제한
    return result.slice(0, limit);
  }

  // Helper for merging weekly community data
  private mergeWeeklyCommunityData(
    emptyData: {
      week: string;
      general: number;
      discussion: number;
      question: number;
      meetup: number;
    }[],
    actualData: {
      week: string;
      general: number;
      discussion: number;
      question: number;
      meetup: number;
    }[],
    limit: number,
  ): {
    week: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    // 빈 데이터와 실제 데이터 맵 생성
    const dataMap: Record<string, any> = {};
    emptyData.forEach((item) => {
      dataMap[item.week] = { ...item };
    });

    // 실제 데이터 병합
    actualData.forEach((item) => {
      if (dataMap[item.week]) {
        dataMap[item.week] = {
          ...dataMap[item.week],
          general: item.general,
          discussion: item.discussion,
          question: item.question,
          meetup: item.meetup,
        };
      } else {
        dataMap[item.week] = { ...item };
      }
    });

    // 맵을 배열로 변환
    const result = Object.values(dataMap);

    // 주차 정보로 정렬 (최신 주 데이터가 먼저 오도록 역순 정렬)
    result.sort((a, b) => {
      const aMonth = parseInt(a.week.split('월')[0]);
      const bMonth = parseInt(b.week.split('월')[0]);

      // 월이 다르면 월로 정렬
      if (aMonth !== bMonth) {
        return bMonth - aMonth; // 내림차순 (최신 월이 먼저)
      }

      // 월이 같으면 주차로 정렬
      const aWeek = parseInt(a.week.split('째주')[0].split('월 ')[1]);
      const bWeek = parseInt(b.week.split('째주')[0].split('월 ')[1]);
      return bWeek - aWeek; // 내림차순 (최신 주차가 먼저)
    });

    // 데이터 개수 제한
    return result.slice(0, limit);
  }

  // Helper method: generate empty yearly interaction data
  private generateEmptyYearlyInteractionData(count = 5): {
    year: string;
    count: number;
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

    for (let i = 0; i < count; i++) {
      const year = (currentYear - count + 1 + i).toString();
      result.push({
        year,
        count: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty monthly interaction data
  private generateEmptyMonthlyInteractionData(count = 12): {
    month: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - count + 1 + i);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      result.push({
        month,
        count: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty weekly interaction data
  private generateEmptyWeeklyInteractionData(): {
    week: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 가장 최근 5주 데이터 생성
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      // 최근 주부터 역순으로 계산 (0주 전, 1주 전, ...)
      date.setDate(date.getDate() - i * 7);

      const month = date.getMonth() + 1;
      const weekOfMonth = Math.ceil(date.getDate() / 7);

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        count: 0,
      });
    }

    // 가장 최근 주부터 보여주기 위해 역순 정렬
    return result.reverse();
  }

  // Helper method: generate empty daily interaction data
  private generateEmptyDailyInteractionData(): {
    date: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 최근 5일간의 데이터 생성
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - 4 + i); // 5일 전부터 오늘까지

      result.push({
        date: this.formatDate(date),
        count: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty yearly community data
  private generateEmptyYearlyCommunityData(count = 5): {
    year: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      result.push({
        year: String(currentYear - i),
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty monthly community data
  private generateEmptyMonthlyCommunityData(count = 5): {
    month: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based를 1-based로 변환

    for (let i = 0; i < count; i++) {
      let year = currentYear;
      let month = currentMonth - i;

      // 이전 년도로 넘어가는 경우
      while (month <= 0) {
        year--;
        month += 12;
      }

      // 월 포맷 (YY-MM)
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      result.push({
        month: `${year}-${monthStr}`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty weekly community data
  private generateEmptyWeeklyCommunityData(): {
    week: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 0-based to 1-based

    // 현재 날짜 기준으로 이번 주가 몇 번째 주인지 계산
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);

    // 지난 5주의 '월 n째주' 형식 데이터 생성
    for (let i = 0; i < 5; i++) {
      let month = currentMonth;
      let weekOfMonth = currentWeekOfMonth - i;

      // 전월로 넘어가는 경우
      while (weekOfMonth <= 0) {
        month = month - 1;
        if (month <= 0) {
          month = 12;
        }
        // 한 달에 대략 4주로 가정
        weekOfMonth = 4 + weekOfMonth;
      }

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  // Helper method: generate empty daily community data
  private generateEmptyDailyCommunityData(): {
    date: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dayStr = day < 10 ? `0${day}` : `${day}`;

      result.push({
        date: `${year}-${monthStr}-${dayStr}`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  // Helper method: get ISO week number from date
  private getISOWeek(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // Helper method: generate time cutoffs for each period
  private generateTimeCutoffs() {
    const now = new Date();

    // 연도별 기준점 (최근 5년)
    const yearCutoffs = [];
    for (let i = 0; i < 5; i++) {
      const year = now.getFullYear() - i;
      yearCutoffs.push({
        year: year.toString(),
        date: new Date(year, 11, 31), // 해당 연도의 마지막 날
      });
    }

    // 월별 기준점 (최근 5개월)
    const monthCutoffs = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate(); // 해당 월의 마지막 날

      const monthStr = month < 10 ? `0${month}` : `${month}`;
      monthCutoffs.push({
        month: `${year}-${monthStr}`,
        date: new Date(year, month - 1, lastDay), // 해당 월의 마지막 날
      });
    }

    // 주별 기준점 (최근 5주)
    const weeklyCutoffs = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);

      const month = date.getMonth() + 1;
      const weekOfMonth = Math.ceil(date.getDate() / 7);

      weeklyCutoffs.push({
        week: `${month}월 ${weekOfMonth}째주`,
        date: new Date(date), // 해당 주의 마지막 날
      });
    }

    // 일별 기준점 (최근 5일)
    const dailyCutoffs = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999); // 해당 일의 마지막 시간

      dailyCutoffs.push({
        date: this.formatDate(date),
        cutoff: date,
      });
    }

    return { yearCutoffs, monthCutoffs, weeklyCutoffs, dailyCutoffs };
  }

  // 1. User Interaction
  async getUserInteraction(
    userId: number,
    requestUserId?: number,
  ): Promise<UserInteractionResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isUserInteractionPublic) {
          return {
            totalLikesReceived: 0,
            totalCommentsReceived: 0,
            totalCommentsCreated: 0,
            totalLikesGiven: 0,
            engagementRate: 0,
            yearlyLikesReceived: [],
            monthlyLikesReceived: [],
            weeklyLikesReceived: [],
            dailyLikesReceived: [],
            yearlyCommentsReceived: [],
            monthlyCommentsReceived: [],
            weeklyCommentsReceived: [],
            dailyCommentsReceived: [],
            yearlyCommentsCreated: [],
            monthlyCommentsCreated: [],
            weeklyCommentsCreated: [],
            dailyCommentsCreated: [],
            yearlyLikesGiven: [],
            monthlyLikesGiven: [],
            weeklyLikesGiven: [],
            dailyLikesGiven: [],
            monthlyLikes: [],
            isPublic: false,
          };
        }
      }

      try {
        // 빈 데이터 생성
        const emptyYearlyData = this.generateEmptyYearlyInteractionData();
        const emptyMonthlyData = this.generateEmptyMonthlyInteractionData();
        const emptyWeeklyData = this.generateEmptyWeeklyInteractionData();
        const emptyDailyData = this.generateEmptyDailyInteractionData();

        // 받은 좋아요 총계
        const totalLikesReceived = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        // 받은 댓글 총계
        const totalCommentsReceived = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        // 작성한 댓글 총계
        const totalCommentsCreated = await this.commentRepository.count({
          where: { authorId: userId },
        });

        // 준 좋아요 총계
        const totalLikesGiven = await this.reviewLikeRepository.count({
          where: { userId },
        });

        // 인게이지먼트 비율 계산
        // (받은 좋아요 + 받은 댓글) / 작성한 리뷰 수 * 100
        const totalReviews = await this.reviewRepository.count({
          where: { authorId: userId },
        });

        let engagementRate = 0;
        if (totalReviews > 0) {
          engagementRate =
            ((totalLikesReceived + totalCommentsReceived) / totalReviews) * 100;
        }

        // 연도별 받은 좋아요 통계
        const yearlyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y')", 'year')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyLikesReceivedRaw = yearlyLikesReceivedData.map((item) => ({
          year: item.year,
          count: parseInt(item.count, 10),
        }));

        const yearlyLikesReceived = this.mergeAndSortData(
          emptyYearlyData,
          yearlyLikesReceivedRaw,
          'year',
          5,
        );

        // 월별 받은 좋아요 통계
        const monthlyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyLikesReceivedRaw = monthlyLikesReceivedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyLikesReceived = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyLikesReceivedRaw,
          'month',
          5,
        );

        // 주별 받은 좋아요 통계
        const fiveWeeksAgo = new Date();
        fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

        const weeklyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(like.createdAt), '월 ', FLOOR((DAY(like.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyLikesReceivedRaw = weeklyLikesReceivedData.map((item) => ({
          week: item.week,
          count: parseInt(item.count, 10),
        }));

        const weeklyLikesReceived = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyLikesReceivedRaw,
          5,
        );

        // 일별 받은 좋아요 통계
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0);

        const dailyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyLikesReceivedRaw = dailyLikesReceivedData.map((item) => ({
          date: item.date,
          count: parseInt(item.count, 10),
        }));

        const dailyLikesReceived = this.mergeAndSortData(
          emptyDailyData,
          dailyLikesReceivedRaw,
          'date',
          5,
        );

        // 연도별 받은 댓글 통계
        const yearlyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y')", 'year')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyCommentsReceivedRaw = yearlyCommentsReceivedData.map(
          (item) => ({
            year: item.year,
            count: parseInt(item.count, 10),
          }),
        );

        const yearlyCommentsReceived = this.mergeAndSortData(
          emptyYearlyData,
          yearlyCommentsReceivedRaw,
          'year',
          5,
        );

        // 월별 받은 댓글 통계
        const monthlyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyCommentsReceivedRaw = monthlyCommentsReceivedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyCommentsReceived = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyCommentsReceivedRaw,
          'month',
          5,
        );

        // 주별 받은 댓글 통계
        const weeklyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(comment.createdAt), '월 ', FLOOR((DAY(comment.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyCommentsReceivedRaw = weeklyCommentsReceivedData.map(
          (item) => ({
            week: item.week,
            count: parseInt(item.count, 10),
          }),
        );

        const weeklyCommentsReceived = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyCommentsReceivedRaw,
          5,
        );

        // 일별 받은 댓글 통계
        const dailyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyCommentsReceivedRaw = dailyCommentsReceivedData.map(
          (item) => ({
            date: item.date,
            count: parseInt(item.count, 10),
          }),
        );

        const dailyCommentsReceived = this.mergeAndSortData(
          emptyDailyData,
          dailyCommentsReceivedRaw,
          'date',
          5,
        );

        // 연도별 작성한 댓글 통계
        const yearlyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y')", 'year')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyCommentsCreatedRaw = yearlyCommentsCreatedData.map(
          (item) => ({
            year: item.year,
            count: parseInt(item.count, 10),
          }),
        );

        const yearlyCommentsCreated = this.mergeAndSortData(
          emptyYearlyData,
          yearlyCommentsCreatedRaw,
          'year',
          5,
        );

        // 월별 작성한 댓글 통계
        const monthlyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyCommentsCreatedRaw = monthlyCommentsCreatedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyCommentsCreated = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyCommentsCreatedRaw,
          'month',
          5,
        );

        // 주별 작성한 댓글 통계
        const weeklyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(comment.createdAt), '월 ', FLOOR((DAY(comment.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyCommentsCreatedRaw = weeklyCommentsCreatedData.map(
          (item) => ({
            week: item.week,
            count: parseInt(item.count, 10),
          }),
        );

        const weeklyCommentsCreated = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyCommentsCreatedRaw,
          5,
        );

        // 일별 작성한 댓글 통계
        const dailyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyCommentsCreatedRaw = dailyCommentsCreatedData.map(
          (item) => ({
            date: item.date,
            count: parseInt(item.count, 10),
          }),
        );

        const dailyCommentsCreated = this.mergeAndSortData(
          emptyDailyData,
          dailyCommentsCreatedRaw,
          'date',
          5,
        );

        // 연도별 준 좋아요 통계
        const yearlyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y')", 'year')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyLikesGivenRaw = yearlyLikesGivenData.map((item) => ({
          year: item.year,
          count: parseInt(item.count, 10),
        }));

        const yearlyLikesGiven = this.mergeAndSortData(
          emptyYearlyData,
          yearlyLikesGivenRaw,
          'year',
          5,
        );

        // 월별 준 좋아요 통계
        const monthlyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyLikesGivenRaw = monthlyLikesGivenData.map((item) => ({
          month: item.month,
          count: parseInt(item.count, 10),
        }));

        const monthlyLikesGiven = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyLikesGivenRaw,
          'month',
          5,
        );

        // 주별 준 좋아요 통계
        const weeklyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(like.createdAt), '월 ', FLOOR((DAY(like.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyLikesGivenRaw = weeklyLikesGivenData.map((item) => ({
          week: item.week,
          count: parseInt(item.count, 10),
        }));

        const weeklyLikesGiven = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyLikesGivenRaw,
          5,
        );

        // 일별 준 좋아요 통계
        const dailyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyLikesGivenRaw = dailyLikesGivenData.map((item) => ({
          date: item.date,
          count: parseInt(item.count, 10),
        }));

        const dailyLikesGiven = this.mergeAndSortData(
          emptyDailyData,
          dailyLikesGivenRaw,
          'date',
          5,
        );

        // 월별 받은 좋아요 수 (최근 12개월) - 기존 코드와 호환성 유지
        const oneYearAgo = new Date();
        oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

        const monthlyLikesData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :oneYearAgo', { oneYearAgo })
          .groupBy('month')
          .orderBy('month', 'ASC')
          .getRawMany();

        const monthlyLikes = monthlyLikesData.map((item) => ({
          month: item.month,
          count: parseInt(item.count, 10),
        }));

        return {
          totalLikesReceived,
          totalCommentsReceived,
          totalCommentsCreated,
          totalLikesGiven,
          engagementRate,
          yearlyLikesReceived,
          monthlyLikesReceived,
          weeklyLikesReceived,
          dailyLikesReceived,
          yearlyCommentsReceived,
          monthlyCommentsReceived,
          weeklyCommentsReceived,
          dailyCommentsReceived,
          yearlyCommentsCreated,
          monthlyCommentsCreated,
          weeklyCommentsCreated,
          dailyCommentsCreated,
          yearlyLikesGiven,
          monthlyLikesGiven,
          weeklyLikesGiven,
          dailyLikesGiven,
          monthlyLikes,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `사용자 상호작용 통계 데이터 조회 중 오류: ${error.message}`,
        );
        return {
          totalLikesReceived: 0,
          totalCommentsReceived: 0,
          totalCommentsCreated: 0,
          totalLikesGiven: 0,
          engagementRate: 0,
          yearlyLikesReceived: [],
          monthlyLikesReceived: [],
          weeklyLikesReceived: [],
          dailyLikesReceived: [],
          yearlyCommentsReceived: [],
          monthlyCommentsReceived: [],
          weeklyCommentsReceived: [],
          dailyCommentsReceived: [],
          yearlyCommentsCreated: [],
          monthlyCommentsCreated: [],
          weeklyCommentsCreated: [],
          dailyCommentsCreated: [],
          yearlyLikesGiven: [],
          monthlyLikesGiven: [],
          weeklyLikesGiven: [],
          dailyLikesGiven: [],
          monthlyLikes: [],
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`사용자 상호작용 통계 조회 중 오류: ${error.message}`);
      return {
        totalLikesReceived: 0,
        totalCommentsReceived: 0,
        totalCommentsCreated: 0,
        totalLikesGiven: 0,
        engagementRate: 0,
        yearlyLikesReceived: [],
        monthlyLikesReceived: [],
        weeklyLikesReceived: [],
        dailyLikesReceived: [],
        yearlyCommentsReceived: [],
        monthlyCommentsReceived: [],
        weeklyCommentsReceived: [],
        dailyCommentsReceived: [],
        yearlyCommentsCreated: [],
        monthlyCommentsCreated: [],
        weeklyCommentsCreated: [],
        dailyCommentsCreated: [],
        yearlyLikesGiven: [],
        monthlyLikesGiven: [],
        weeklyLikesGiven: [],
        dailyLikesGiven: [],
        monthlyLikes: [],
        isPublic: true,
      };
    }
  }

  // 2. Follower Stats
  async getFollowerStats(
    userId: number,
    requestUserId?: number,
  ): Promise<FollowerStatsResponseDto> {
    try {
      this.logger.log(
        `팔로워 통계 조회 시작: userId=${userId}, requestUserId=${requestUserId}`,
      );

      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isFollowerStatsPublic) {
          // 비공개인 경우 생성된 빈 데이터 반환
          return {
            followersCount: 0,
            followingCount: 0,
            followerGrowth: this.generateEmptyMonthlyInteractionData(5).map(
              (item) => ({
                date: item.month,
                count: 0,
              }),
            ),
            yearly: this.generateEmptyYearlyInteractionData(5).map((item) => ({
              year: item.year,
              followers: 0,
              following: 0,
            })),
            monthly: this.generateEmptyMonthlyInteractionData(5).map(
              (item) => ({
                month: item.month,
                followers: 0,
                following: 0,
              }),
            ),
            weekly: this.generateEmptyWeeklyInteractionData().map((item) => ({
              week: item.week,
              followers: 0,
              following: 0,
            })),
            daily: this.generateEmptyDailyInteractionData()
              .slice(0, 5)
              .map((item) => ({
                date: item.date,
                followers: 0,
                following: 0,
              })),
            isPublic: false,
          };
        }
      }

      // 1. 빈 데이터 준비
      const emptyYearlyData = this.generateEmptyYearlyInteractionData(5).map(
        (item) => ({
          year: item.year,
          followers: 0,
          following: 0,
        }),
      );
      const emptyMonthlyData = this.generateEmptyMonthlyInteractionData(5).map(
        (item) => ({
          month: item.month,
          followers: 0,
          following: 0,
        }),
      );
      const emptyWeeklyData = this.generateEmptyWeeklyInteractionData().map(
        (item) => ({
          week: item.week,
          followers: 0,
          following: 0,
        }),
      );
      const emptyDailyData = this.generateEmptyDailyInteractionData()
        .slice(0, 5)
        .map((item) => ({
          date: item.date,
          followers: 0,
          following: 0,
        }));

      // 2. 현재 팔로워/팔로잉 수 조회
      const followers = await this.userFollowerRepository.find({
        where: { following_id: userId },
        order: { created_at: 'ASC' },
      });
      const followersCount = followers.length;
      this.logger.log(`팔로워 수: ${followersCount}, 생성일순 정렬`);

      const following = await this.userFollowerRepository.find({
        where: { follower_id: userId },
        order: { created_at: 'ASC' }, // 시간순으로 정렬
      });
      const followingCount = following.length;
      this.logger.log(`팔로잉 수: ${followingCount}`);

      // 3. 팔로워 데이터가 없으면 빈 데이터 반환
      if (followers.length === 0 && following.length === 0) {
        return {
          followersCount: 0,
          followingCount: 0,
          followerGrowth: emptyMonthlyData.map((item) => ({
            date: item.month,
            count: 0,
          })),
          yearly: emptyYearlyData,
          monthly: emptyMonthlyData,
          weekly: emptyWeeklyData,
          daily: emptyDailyData,
          isPublic: true,
        };
      }

      // 4. 각 기간별 기준 날짜 생성
      const { yearCutoffs, monthCutoffs, weeklyCutoffs, dailyCutoffs } =
        this.generateTimeCutoffs();

      // 5. 각 기간별로 기준 시점까지 생성된 팔로워/팔로잉 수 계산

      // 연도별 데이터
      const yearly = yearCutoffs.map((yearCutoff) => {
        const cutoffDate = yearCutoff.date;

        // 해당 연도까지의 팔로워 수
        const followerCount = followers.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        // 해당 연도까지의 팔로잉 수
        const followingCount = following.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        return {
          year: yearCutoff.year,
          followers: followerCount,
          following: followingCount,
        };
      });

      // 월별 데이터
      const monthly = monthCutoffs.map((monthCutoff) => {
        const cutoffDate = monthCutoff.date;

        // 해당 월까지의 팔로워 수
        const followerCount = followers.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        // 해당 월까지의 팔로잉 수
        const followingCount = following.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        return {
          month: monthCutoff.month,
          followers: followerCount,
          following: followingCount,
        };
      });

      // 주별 데이터
      const weekly = weeklyCutoffs.map((weekCutoff) => {
        const cutoffDate = weekCutoff.date;

        // 해당 주까지의 팔로워 수
        const followerCount = followers.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        // 해당 주까지의 팔로잉 수
        const followingCount = following.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        return {
          week: weekCutoff.week,
          followers: followerCount,
          following: followingCount,
        };
      });

      // 일별 데이터
      const daily = dailyCutoffs.map((dayCutoff) => {
        const cutoffDate = dayCutoff.cutoff;

        // 해당 일까지의 팔로워 수
        const followerCount = followers.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        // 해당 일까지의 팔로잉 수
        const followingCount = following.filter(
          (f) => new Date(f.created_at) <= cutoffDate,
        ).length;

        return {
          date: dayCutoff.date,
          followers: followerCount,
          following: followingCount,
        };
      });

      // 9. followerGrowth 필드 생성 (월별 데이터 기반)
      const followerGrowth = monthly.map((item) => ({
        date: item.month,
        count: item.followers,
      }));

      this.logger.log(`팔로워 통계 조회 완료: 
        followersCount=${followersCount}, 
        followingCount=${followingCount}`);

      return {
        followersCount,
        followingCount,
        followerGrowth,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(
        `팔로워 통계 조회 중 오류: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 3. Community Activity
  async getCommunityActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<CommunityActivityResponseDto> {
    try {
      this.logger.log(
        `커뮤니티 활동 통계 조회 시작: userId=${userId}, requestUserId=${requestUserId}`,
      );

      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isCommunityActivityPublic) {
          return {
            totalReviews: 0,
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 작성한 총 리뷰 수 ('review' 타입 제외)
      const totalReviews = await this.reviewRepository.count({
        where: {
          authorId: userId,
          type: Not('review'),
        },
      });

      this.logger.log(`총 리뷰 개수: ${totalReviews}`);

      // 연도별 리뷰 타입별 데이터 (최근 5년)
      const yearlyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y')", 'year')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .groupBy('year')
        .orderBy('year', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`연도별 리뷰 데이터: ${JSON.stringify(yearlyData)}`);

      // 월별 리뷰 타입별 데이터 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`월별 리뷰 데이터: ${JSON.stringify(monthlyData)}`);

      // 주별 리뷰 타입별 데이터 (최근 5주)
      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 = 35일

      const weeklyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select(
          "CONCAT(YEAR(review.createdAt), '-', WEEK(review.createdAt))",
          'yearWeek',
        )
        .addSelect(
          "CONCAT(MONTH(review.createdAt), '월 ', FLOOR((DAY(review.createdAt) - 1) / 7) + 1, '째주')",
          'week',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('yearWeek, week')
        .orderBy('yearWeek', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`주별 리뷰 데이터: ${JSON.stringify(weeklyData)}`);

      // 일별 리뷰 타입별 데이터 (최근 5일)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m-%d')", 'date')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
        .groupBy('date')
        .orderBy('date', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`일별 리뷰 데이터: ${JSON.stringify(dailyData)}`);

      // 빈 데이터 생성
      const emptyYearlyData = this.generateEmptyYearlyCommunityData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyCommunityData(5);
      const emptyWeeklyData = this.generateEmptyWeeklyCommunityData().slice(
        0,
        5,
      );
      const emptyDailyData = this.generateEmptyDailyCommunityData().slice(0, 5);

      // 데이터가 전혀 없는 경우 빈 배열 넣기
      if (totalReviews === 0) {
        return {
          totalReviews: 0,
          yearly: emptyYearlyData.slice(0, 5),
          monthly: emptyMonthlyData.slice(0, 5),
          weekly: emptyWeeklyData.slice(0, 5),
          daily: emptyDailyData.slice(0, 5),
          isPublic: true,
        };
      }

      // 실제 데이터 형식 변환 및 숫자로 변환
      const formattedYearlyData = yearlyData.map((item) => ({
        year: item.year,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedMonthlyData = monthlyData.map((item) => ({
        month: item.month,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedWeeklyData = weeklyData.map((item) => ({
        week: item.week,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedDailyData = dailyData.map((item) => ({
        date: item.date,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      // 실제 데이터가 있는지 확인
      this.logger.log(`정리된 데이터: 
        연도별: ${JSON.stringify(formattedYearlyData)}, 
        월별: ${JSON.stringify(formattedMonthlyData)}, 
        주별: ${JSON.stringify(formattedWeeklyData)}, 
        일별: ${JSON.stringify(formattedDailyData)}`);

      // 빈 데이터와 실제 데이터 병합 (커스텀 병합 함수 필요)
      let yearly = this.mergeAndSortCommunityData(
        emptyYearlyData,
        formattedYearlyData,
        'year',
        5,
      );

      let monthly = this.mergeAndSortCommunityData(
        emptyMonthlyData,
        formattedMonthlyData,
        'month',
        5,
      );

      let weekly = this.mergeWeeklyCommunityData(
        emptyWeeklyData,
        formattedWeeklyData,
        5,
      );

      let daily = this.mergeAndSortCommunityData(
        emptyDailyData,
        formattedDailyData,
        'date',
        5,
      );

      // 최신 데이터부터 나오도록 역순 정렬
      yearly = yearly.reverse();
      monthly = monthly.reverse();
      daily = daily.reverse();

      // 데이터 개수 제한
      yearly = yearly.slice(0, 5);
      monthly = monthly.slice(0, 5);
      weekly = weekly.slice(0, 5);
      daily = daily.slice(0, 5);

      // 병합 결과 로깅
      this.logger.log(`병합된 데이터:
        연도별: ${JSON.stringify(yearly)},
        월별: ${JSON.stringify(monthly)},
        주별: ${JSON.stringify(weekly)},
        일별: ${JSON.stringify(daily)}`);

      return {
        totalReviews,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`커뮤니티 활동 통계 조회 중 오류: ${error.message}`);
      this.logger.error(error.stack);

      // 오류 발생 시 기본값 반환 대신 빈 데이터 생성해서 반환
      const emptyYearlyData = this.generateEmptyYearlyCommunityData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyCommunityData(5).slice(
        0,
        5,
      );
      const emptyWeeklyData = this.generateEmptyWeeklyCommunityData().slice(
        0,
        5,
      );
      const emptyDailyData = this.generateEmptyDailyCommunityData().slice(0, 5);

      return {
        totalReviews: 0,
        yearly: emptyYearlyData,
        monthly: emptyMonthlyData,
        weekly: emptyWeeklyData,
        daily: emptyDailyData,
        isPublic: true,
      };
    }
  }

  // 4. Review Influence
  async getReviewInfluence(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewInfluenceResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReviewInfluencePublic) {
          return {
            averageLikesPerReview: 0,
            popularReviews: [],
            communityContributionScore: 0,
            isPublic: false,
          };
        }
      }

      try {
        // 리뷰당 평균 좋아요 수 ('review' 타입 제외)
        const likesData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('AVG(review.likeCount)', 'average')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .getRawOne();

        const averageLikesPerReview = likesData
          ? parseFloat(likesData.average) || 0
          : 0;

        // 가장 인기 있는 리뷰 TOP 5 ('review' 타입 제외)
        const popularReviewsData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('review.id', 'id')
          .addSelect('SUBSTRING(review.content, 1, 100)', 'content')
          .addSelect('review.likeCount', 'likes')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .orderBy('review.likeCount', 'DESC')
          .limit(5)
          .getRawMany();

        const popularReviews = popularReviewsData.map((item) => ({
          id: parseInt(item.id, 10),
          content:
            (item.content || '내용 없음') +
            (item.content && item.content.length >= 100 ? '...' : ''),
          likes: parseInt(item.likes, 10) || 0,
        }));

        // 커뮤니티 기여도 점수 (리뷰 수 + 받은 좋아요 수 + 받은 댓글 수) ('review' 타입 제외)
        const totalReviews = await this.reviewRepository.count({
          where: {
            authorId: userId,
            type: Not('review'),
          },
        });

        const totalLikes = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .getCount();

        const totalComments = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .getCount();

        const communityContributionScore =
          totalReviews + totalLikes + totalComments;

        return {
          averageLikesPerReview,
          popularReviews,
          communityContributionScore,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `리뷰 영향력 통계 데이터 조회 중 오류: ${error.message}`,
        );
        return {
          averageLikesPerReview: 0,
          popularReviews: [],
          communityContributionScore: 0,
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`리뷰 영향력 통계 조회 중 오류: ${error.message}`);
      return {
        averageLikesPerReview: 0,
        popularReviews: [],
        communityContributionScore: 0,
        isPublic: true,
      };
    }
  }
}
