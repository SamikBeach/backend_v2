import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, Equal } from 'typeorm';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import { Review } from '../../review/entities/review.entity';
import { Rating } from '../../rating/entities/rating.entity';
import {
  ReviewStatsResponseDto,
  RatingStatsResponseDto,
  ActivityFrequencyResponseDto,
  RatingHabitsResponseDto,
} from '../dto/review-rating-statistics.dto';

@Injectable()
export class ReviewRatingStatisticsService {
  private readonly logger = new Logger(ReviewRatingStatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
  ) {}

  async getOrCreateUserStatisticsSetting(
    userId: number,
  ): Promise<UserStatisticsSetting> {
    // 사용자 통계 설정 조회
    let setting = await this.userStatisticsSettingRepository.findOne({
      where: { userId },
    });

    // 설정이 없으면 기본값으로 생성
    if (!setting) {
      setting = this.userStatisticsSettingRepository.create({
        userId,
        // 기본값은 모두 비공개
        isReadingStatusPublic: false,
        isReadingStatusByPeriodPublic: false,
        isGenreAnalysisPublic: false,
        isAuthorPublisherStatsPublic: false,
        isReviewStatsPublic: false,
        isRatingStatsPublic: false,
        isActivityFrequencyPublic: false,
        isRatingHabitsPublic: false,
        isUserInteractionPublic: false,
        isFollowerStatsPublic: false,
        isCommunityActivityPublic: false,
        isReviewInfluencePublic: false,
        isLibraryCompositionPublic: false,
        isLibraryPopularityPublic: false,
        isLibraryUpdatePatternPublic: false,
        isSearchActivityPublic: false,
      });

      await this.userStatisticsSettingRepository.save(setting);
    }

    return setting;
  }

  // 리뷰 통계
  async getReviewStats(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReviewStatsPublic) {
          return {
            totalReviews: 0,
            monthlyReviewCounts: [],
            reviewTypeDistribution: [],
            averageReviewLength: 0,
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 사용자 리뷰 총 개수
      const totalReviews = await this.reviewRepository.count({
        where: { authorId: userId },
      });

      if (totalReviews === 0) {
        return {
          totalReviews: 0,
          monthlyReviewCounts: [],
          reviewTypeDistribution: [],
          averageReviewLength: 0,
          yearly: [],
          monthly: [],
          weekly: [],
          daily: [],
          isPublic: true,
        };
      }

      // 리뷰 평균 길이
      const avgLengthResult = await this.reviewRepository
        .createQueryBuilder('review')
        .select('AVG(LENGTH(review.content))', 'avgLength')
        .where('review.authorId = :userId', { userId })
        .getRawOne();

      const averageReviewLength = Math.round(
        parseFloat(avgLengthResult?.avgLength || '0'),
      );

      // 리뷰 유형 분포 (길이별로 구분)
      const shortReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw((alias) => `LENGTH(${alias}) <= 200`),
        },
      });

      const mediumReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw(
            (alias) => `LENGTH(${alias}) > 200 AND LENGTH(${alias}) <= 1000`,
          ),
        },
      });

      const longReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw((alias) => `LENGTH(${alias}) > 1000`),
        },
      });

      // 비율 계산
      const reviewTypeDistribution = [];
      if (totalReviews > 0) {
        reviewTypeDistribution.push({
          type: '짧은 리뷰 (200자 이하)',
          percentage: (shortReviewsCount / totalReviews) * 100,
        });
        reviewTypeDistribution.push({
          type: '중간 리뷰 (201-1000자)',
          percentage: (mediumReviewsCount / totalReviews) * 100,
        });
        reviewTypeDistribution.push({
          type: '긴 리뷰 (1000자 초과)',
          percentage: (longReviewsCount / totalReviews) * 100,
        });
      }

      // 월별 리뷰 작성 수 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyReviewCountsData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyReviewCounts = monthlyReviewCountsData.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      }));

      // 연도별 트렌드
      const yearlyTrendQuery = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y')", 'year')
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .groupBy('year')
        .orderBy('year', 'ASC')
        .getRawMany();

      const yearly = yearlyTrendQuery.map((item) => ({
        year: item.year,
        count: parseInt(item.count, 10),
      }));

      // 월별 트렌드
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      const monthlyTrendQuery = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :fiveMonthsAgo', { fiveMonthsAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      // 빈 월별 데이터 생성
      const emptyMonthlyData = this.generateEmptyMonthlyInteractionData(5);

      // 실제 데이터 매핑
      const mappedMonthlyData = monthlyTrendQuery.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      }));

      // 병합 및 정렬
      const monthly = this.mergeAndSortData(
        emptyMonthlyData,
        mappedMonthlyData,
        'month',
        5,
      );

      // 주별 트렌드
      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

      const weeklyTrendQuery = await this.reviewRepository
        .createQueryBuilder('review')
        .select(
          "CONCAT(YEAR(review.createdAt), '-', WEEK(review.createdAt))",
          'yearWeek',
        )
        .addSelect(
          "CONCAT(MONTH(review.createdAt), '월 ', FLOOR((DAY(review.createdAt) - 1) / 7) + 1, '째주')",
          'week',
        )
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('yearWeek, week')
        .orderBy('yearWeek', 'ASC')
        .getRawMany();

      // 빈 주별 데이터 생성
      const emptyWeeklyData = this.generateEmptyWeeklyInteractionData();

      // 실제 데이터 매핑
      const mappedWeeklyData = weeklyTrendQuery.map((item) => ({
        week: item.week,
        count: parseInt(item.count, 10),
      }));

      // 병합 및 정렬
      const weekly = this.mergeWeeklyData(emptyWeeklyData, mappedWeeklyData, 5);

      // 일별 트렌드
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const dailyTrendQuery = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      // 빈 일별 데이터 생성
      const emptyDailyData = this.generateEmptyDailyInteractionData();

      // 실제 데이터 매핑
      const mappedDailyData = dailyTrendQuery.map((item) => ({
        date: item.date,
        count: parseInt(item.count, 10),
      }));

      // 병합 및 정렬
      const daily = this.mergeAndSortData(
        emptyDailyData,
        mappedDailyData,
        'date',
        5,
      );

      return {
        totalReviews,
        monthlyReviewCounts,
        reviewTypeDistribution,
        averageReviewLength,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`리뷰 통계 조회 중 오류: ${error.message}`);
      return {
        totalReviews: 0,
        monthlyReviewCounts: [],
        reviewTypeDistribution: [],
        averageReviewLength: 0,
        yearly: [],
        monthly: [],
        weekly: [],
        daily: [],
        isPublic: true,
      };
    }
  }

  // Helper method: format date
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Helper method: merge and sort data
  private mergeAndSortData<T>(
    emptyData: T[],
    actualData: T[],
    key: string,
    limit: number,
  ): T[] {
    // 실제 데이터가 비어있으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData;
    }

    // 각 키별로 데이터를 저장할 객체 맵 생성
    const dataMap = new Map<string, T>();

    // 빈 데이터 먼저 맵에 등록
    emptyData.forEach((item) => {
      dataMap.set(item[key], item);
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      dataMap.set(item[key], item);
    });

    // 맵을 배열로 변환하여 키 기준으로 정렬
    const result = Array.from(dataMap.values()).sort((a, b) => {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
      return 0;
    });

    // 최근 데이터가 먼저 오도록 역순 정렬 후 limit 개수만 반환
    return result.slice(0, limit);
  }

  // 주간 데이터 특별 병합 (특수한 형식의 주 정보 때문에)
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

  // 평점 통계
  async getRatingStats(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isRatingStatsPublic) {
          return {
            averageRating: 0,
            ratingDistribution: [],
            categoryRatings: [],
            monthlyAverageRatings: [],
            isPublic: false,
          };
        }
      }

      // 총 평점 수
      const totalRatings = await this.ratingRepository.count({
        where: { userId },
      });

      if (totalRatings === 0) {
        return {
          averageRating: 0,
          ratingDistribution: [],
          categoryRatings: [],
          monthlyAverageRatings: [],
          isPublic: true,
        };
      }

      // 평점 분포 (1~5점)
      const ratingDistribution = [];
      for (let i = 1; i <= 5; i++) {
        const count = await this.ratingRepository.count({
          where: {
            userId,
            rating: Equal(i),
          },
        });

        ratingDistribution.push({
          rating: i,
          count,
        });
      }

      // 평균 평점
      const avgResult = await this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .where('rating.userId = :userId', { userId })
        .getRawOne();

      const averageRating = parseFloat(avgResult?.average || '0').toFixed(1);

      // 카테고리별 평균 평점
      const categoryRatingsData = await this.ratingRepository
        .createQueryBuilder('rating')
        .innerJoin('rating.book', 'book')
        .leftJoin('book.category', 'category')
        .select("COALESCE(category.name, '미분류')", 'category')
        .addSelect('AVG(rating.rating)', 'averageRating')
        .addSelect('COUNT(rating.id)', 'count')
        .where('rating.userId = :userId', { userId })
        .groupBy("COALESCE(category.name, '미분류')")
        .having('COUNT(rating.id) >= 3') // 최소 3개 이상의 평점
        .orderBy('averageRating', 'DESC')
        .limit(5)
        .getRawMany();

      let categoryRatings = categoryRatingsData.map((item) => ({
        category: item.category,
        averageRating: parseFloat(item.averageRating),
      }));

      // 카테고리 결과가 없으면 기본 미분류 카테고리 추가
      if (categoryRatings.length === 0) {
        // 카테고리별 모든 평점 데이터 가져오기 (최소 카운트 기준 무시)
        const allCategoryRatingsData = await this.ratingRepository
          .createQueryBuilder('rating')
          .innerJoin('rating.book', 'book')
          .leftJoin('book.category', 'category')
          .select("COALESCE(category.name, '미분류')", 'category')
          .addSelect('AVG(rating.rating)', 'averageRating')
          .addSelect('COUNT(rating.id)', 'count')
          .where('rating.userId = :userId', { userId })
          .groupBy("COALESCE(category.name, '미분류')")
          .orderBy('COUNT(rating.id)', 'DESC')
          .limit(5)
          .getRawMany();

        if (allCategoryRatingsData.length > 0) {
          // 최소 카운트 제한 없이 모든 카테고리 데이터 사용
          categoryRatings = allCategoryRatingsData.map((item) => ({
            category: item.category,
            averageRating: parseFloat(item.averageRating),
          }));
        } else {
          // 그래도 데이터가 없으면 미분류 카테고리만 추가
          categoryRatings.push({
            category: '미분류',
            averageRating: parseFloat(averageRating),
          });
        }
      }

      // 월별 평균 평점 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyAvgRatingsData = await this.ratingRepository
        .createQueryBuilder('rating')
        .select("DATE_FORMAT(rating.createdAt, '%Y-%m')", 'month')
        .addSelect('AVG(rating.rating)', 'averageRating')
        .where('rating.userId = :userId', { userId })
        .andWhere('rating.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyAverageRatings = monthlyAvgRatingsData.map((item) => ({
        month: item.month,
        averageRating: parseFloat(item.averageRating),
      }));

      return {
        averageRating: parseFloat(averageRating),
        ratingDistribution,
        categoryRatings,
        monthlyAverageRatings,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`평점 통계 조회 중 오류: ${error.message}`);
      return {
        averageRating: 0,
        ratingDistribution: [],
        categoryRatings: [],
        monthlyAverageRatings: [],
        isPublic: true,
      };
    }
  }

  // 액티비티 빈도 통계
  async getActivityFrequency(
    userId: number,
    requestUserId?: number,
  ): Promise<ActivityFrequencyResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isActivityFrequencyPublic) {
          return {
            averageReviewInterval: 0,
            averageRatingInterval: 0,
            mostActiveHour: '',
            mostActiveDay: '',
            isPublic: false,
          };
        }
      }

      // 리뷰 작성 주기 계산
      const reviewTimes = await this.reviewRepository
        .createQueryBuilder('review')
        .select('review.createdAt', 'createdAt')
        .where('review.authorId = :userId', { userId })
        .orderBy('review.createdAt', 'ASC')
        .getRawMany();

      let averageReviewInterval = 0;
      if (reviewTimes.length > 1) {
        // 연속된 리뷰 사이의 시간 간격(일) 계산
        let totalDays = 0;
        for (let i = 1; i < reviewTimes.length; i++) {
          const prevTime = new Date(reviewTimes[i - 1].createdAt);
          const currTime = new Date(reviewTimes[i].createdAt);
          const diffTime = Math.abs(currTime.getTime() - prevTime.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDays += diffDays;
        }
        averageReviewInterval = totalDays / (reviewTimes.length - 1);
      }

      // 평점 등록 주기 계산
      const ratingTimes = await this.ratingRepository
        .createQueryBuilder('rating')
        .select('rating.createdAt', 'createdAt')
        .where('rating.userId = :userId', { userId })
        .orderBy('rating.createdAt', 'ASC')
        .getRawMany();

      let averageRatingInterval = 0;
      if (ratingTimes.length > 1) {
        // 연속된 평점 사이의 시간 간격(일) 계산
        let totalDays = 0;
        for (let i = 1; i < ratingTimes.length; i++) {
          const prevTime = new Date(ratingTimes[i - 1].createdAt);
          const currTime = new Date(ratingTimes[i].createdAt);
          const diffTime = Math.abs(currTime.getTime() - prevTime.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDays += diffDays;
        }
        averageRatingInterval = totalDays / (ratingTimes.length - 1);
      }

      // 가장 활동적인 시간대
      const hourlyActivity = await this.reviewRepository
        .createQueryBuilder('review')
        .select('HOUR(review.createdAt)', 'hour')
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .groupBy('hour')
        .orderBy('count', 'DESC')
        .getRawMany();

      let mostActiveHour = '';
      if (hourlyActivity.length > 0) {
        const hour = parseInt(hourlyActivity[0].hour);
        mostActiveHour = `${hour}시~${hour + 1}시`;
      } else {
        mostActiveHour = '데이터 없음';
      }

      // 가장 활동적인 요일
      const dayActivity = await this.reviewRepository
        .createQueryBuilder('review')
        .select('WEEKDAY(review.createdAt)', 'day')
        .addSelect('COUNT(*)', 'count')
        .where('review.authorId = :userId', { userId })
        .groupBy('day')
        .orderBy('count', 'DESC')
        .getRawMany();

      const days = ['월', '화', '수', '목', '금', '토', '일'];
      let mostActiveDay = '';
      if (dayActivity.length > 0) {
        const day = parseInt(dayActivity[0].day);
        mostActiveDay = days[day] + '요일';
      } else {
        mostActiveDay = '데이터 없음';
      }

      return {
        averageReviewInterval: Math.round(averageReviewInterval),
        averageRatingInterval: Math.round(averageRatingInterval),
        mostActiveHour,
        mostActiveDay,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`액티비티 빈도 통계 조회 중 오류: ${error.message}`);
      return {
        averageReviewInterval: 0,
        averageRatingInterval: 0,
        mostActiveHour: '데이터 없음',
        mostActiveDay: '데이터 없음',
        isPublic: true,
      };
    }
  }

  // 평가 습관 통계
  async getRatingHabits(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingHabitsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isRatingHabitsPublic) {
          return {
            highestRatedBooks: [],
            lowestRatedBooks: [],
            ratingLengthCorrelation: [],
            isPublic: false,
          };
        }
      }

      // 가장 높은 평점을 준 책 (5점)
      const highestRatedBooks = await this.ratingRepository
        .createQueryBuilder('rating')
        .innerJoin('rating.book', 'book')
        .select('book.title', 'title')
        .addSelect('book.author', 'author')
        .addSelect('rating.rating', 'rating')
        .where('rating.userId = :userId', { userId })
        .orderBy('rating.rating', 'DESC')
        .addOrderBy('rating.createdAt', 'DESC') // 최근에 평가한 것 우선
        .limit(5)
        .getRawMany();

      // 가장 낮은 평점을 준 책 (1점)
      const lowestRatedBooks = await this.ratingRepository
        .createQueryBuilder('rating')
        .innerJoin('rating.book', 'book')
        .select('book.title', 'title')
        .addSelect('book.author', 'author')
        .addSelect('rating.rating', 'rating')
        .where('rating.userId = :userId', { userId })
        .orderBy('rating.rating', 'ASC')
        .addOrderBy('rating.createdAt', 'DESC') // 최근에 평가한 것 우선
        .limit(5)
        .getRawMany();

      // 평점별 리뷰 길이 상관관계
      const ratingLengthData = await this.ratingRepository
        .createQueryBuilder('rating')
        .innerJoin(
          'review.review',
          'review',
          'review.bookId = rating.bookId AND review.authorId = rating.userId',
        )
        .select('rating.rating', 'rating')
        .addSelect('AVG(LENGTH(review.content))', 'averageLength')
        .addSelect('COUNT(review.id)', 'count')
        .where('rating.userId = :userId', { userId })
        .groupBy('rating.rating')
        .having('COUNT(review.id) > 0')
        .orderBy('rating.rating', 'ASC')
        .getRawMany();

      const ratingLengthCorrelation = ratingLengthData.map((item) => ({
        rating: parseInt(item.rating),
        averageLength: Math.round(parseFloat(item.averageLength) || 0),
      }));

      return {
        highestRatedBooks: highestRatedBooks.map((book) => ({
          title: book.title,
          author: book.author,
          rating: parseInt(book.rating),
        })),
        lowestRatedBooks: lowestRatedBooks.map((book) => ({
          title: book.title,
          author: book.author,
          rating: parseInt(book.rating),
        })),
        ratingLengthCorrelation,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`평가 습관 통계 조회 중 오류: ${error.message}`);
      return {
        highestRatedBooks: [],
        lowestRatedBooks: [],
        ratingLengthCorrelation: [],
        isPublic: true,
      };
    }
  }
}
