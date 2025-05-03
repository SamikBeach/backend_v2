import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import { Library } from '../../library/entities/library.entity';
import { LibraryBook } from '../../library/entities/library-book.entity';
import { LibraryTagMapping } from '../../library/entities/library-tag-mapping.entity';
import { LibrarySubscription } from '../../library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from '../../library/entities/library-update-history.entity';
import {
  LibraryCompositionResponseDto,
  LibraryPopularityResponseDto,
  LibraryUpdatePatternResponseDto,
} from '../dto/library-statistics.dto';

@Injectable()
export class LibraryStatisticsService {
  private readonly logger = new Logger(LibraryStatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(Library)
    private readonly libraryRepository: Repository<Library>,
    @InjectRepository(LibraryBook)
    private readonly libraryBookRepository: Repository<LibraryBook>,
    @InjectRepository(LibraryTagMapping)
    private readonly libraryTagMappingRepository: Repository<LibraryTagMapping>,
    @InjectRepository(LibrarySubscription)
    private readonly librarySubscriptionRepository: Repository<LibrarySubscription>,
    @InjectRepository(LibraryUpdateHistory)
    private readonly libraryUpdateHistoryRepository: Repository<LibraryUpdateHistory>,
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

  // Helper for merging data
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

  // Helper for generating empty subscription data
  private generateEmptySubscriptionData(count = 5): {
    date: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        date: `date-${i}`,
        libraries: [],
      });
    }
    return result;
  }

  // Helper for generating empty yearly subscription data
  private generateEmptyYearlySubscriptionData(count = 5): {
    year: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

    for (let i = 0; i < count; i++) {
      result.push({
        year: (currentYear - i).toString(),
        libraries: [],
      });
    }

    return result;
  }

  // Helper for generating empty monthly subscription data
  private generateEmptyMonthlySubscriptionData(count = 5): {
    month: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const today = new Date();
    const result = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = month < 10 ? `0${month}` : `${month}`;

      result.push({
        month: `${year}-${monthStr}`,
        libraries: [],
      });
    }

    return result;
  }

  // Helper for generating empty weekly subscription data
  private generateEmptyWeeklySubscriptionData(): {
    week: string;
    libraries: { library: string; subscribers: number }[];
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
        libraries: [],
      });
    }

    // 최신 주 데이터가 먼저 오도록 역순 정렬
    return result.reverse();
  }

  async getLibraryComposition(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryCompositionResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryCompositionPublic) {
          return {
            totalLibraries: 0,
            booksPerLibrary: [],
            tagsDistribution: [],
            isPublic: false,
          };
        }
      }

      // 생성한 서재 수
      const totalLibraries = await this.libraryRepository.count({
        where: { ownerId: userId },
      });

      // 서재별 도서 수
      const booksPerLibraryData = await this.libraryRepository
        .createQueryBuilder('library')
        .leftJoin('library.libraryBooks', 'libraryBook')
        .select('library.name', 'name')
        .addSelect('COUNT(libraryBook.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .orderBy('count', 'DESC')
        .getRawMany();

      const booksPerLibrary = booksPerLibraryData.map((item) => ({
        name: item.name,
        count: parseInt(item.count, 10),
      }));

      // 서재별 태그 분포
      const librariesWithTags = await this.libraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.libraryTagMappings', 'tagMapping')
        .leftJoinAndSelect('tagMapping.libraryTag', 'libraryTag')
        .where('library.ownerId = :userId', { userId })
        .getMany();

      const tagsDistribution = [];

      for (const library of librariesWithTags) {
        const tagCounts = {};

        // 태그 카운팅
        if (
          library.libraryTagMappings &&
          library.libraryTagMappings.length > 0
        ) {
          library.libraryTagMappings.forEach((mapping) => {
            if (mapping.libraryTag && mapping.libraryTag.name) {
              const tagName = mapping.libraryTag.name;
              tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
          });
        }

        // 객체에서 배열로 변환
        const tags = Object.entries(tagCounts).map(([tag, count]) => ({
          tag,
          count: count as number,
        }));

        // 결과에 추가
        if (tags.length > 0) {
          tagsDistribution.push({
            library: library.name,
            tags,
          });
        }
      }

      return {
        totalLibraries,
        booksPerLibrary,
        tagsDistribution,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`서재 구성 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getLibraryPopularity(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryPopularityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryPopularityPublic) {
          return {
            subscribersPerLibrary: [],
            mostPopularLibrary: '',
            popularityTrend: [],
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 서재별 구독자 수
      const subscribersPerLibraryData = await this.libraryRepository
        .createQueryBuilder('library')
        .select('library.name', 'library')
        .addSelect('library.subscriberCount', 'subscribers')
        .where('library.ownerId = :userId', { userId })
        .orderBy('library.subscriberCount', 'DESC')
        .getRawMany();

      const subscribersPerLibrary = subscribersPerLibraryData.map((item) => ({
        library: item.library,
        subscribers: parseInt(item.subscribers, 10),
      }));

      this.logger.debug(
        `서재별 구독자 수: ${JSON.stringify(subscribersPerLibrary)}`,
      );

      // 가장 인기 있는 서재
      let mostPopularLibrary = '없음';
      if (
        subscribersPerLibrary.length > 0 &&
        subscribersPerLibrary[0].subscribers > 0
      ) {
        mostPopularLibrary = subscribersPerLibrary[0].library;
      }

      // Top 구독자 서재 목록 (최대 5개)
      const topLibraries = subscribersPerLibrary
        .filter((lib) => lib.subscribers > 0)
        .slice(0, 5)
        .map((lib) => ({
          library: lib.library,
          subscribers: lib.subscribers,
        }));

      // 구독자가 0이어도 최소한의 서재 표시
      if (topLibraries.length === 0 && subscribersPerLibrary.length > 0) {
        topLibraries.push(
          ...subscribersPerLibrary.slice(0, 5).map((lib) => ({
            library: lib.library,
            subscribers: lib.subscribers,
          })),
        );
      }

      this.logger.debug(`상위 서재 목록: ${JSON.stringify(topLibraries)}`);

      // 서재 인기도 추이 (월별)
      const librariesPopularityData = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.name', 'library')
        .addSelect("DATE_FORMAT(subscription.createdAt, '%Y-%m')", 'date')
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .addGroupBy('date')
        .orderBy('library.name', 'ASC')
        .addOrderBy('date', 'ASC')
        .getRawMany();

      this.logger.debug(
        `서재 인기도 추이 데이터: ${JSON.stringify(librariesPopularityData)}`,
      );

      // 결과를 서재별로 그룹화
      interface TrendItem {
        date: string;
        subscribers: number;
      }

      interface LibraryTrend {
        library: string;
        trend: TrendItem[];
      }

      const popularityTrendMap: Record<string, LibraryTrend> = {};

      librariesPopularityData.forEach((item) => {
        if (!popularityTrendMap[item.library]) {
          popularityTrendMap[item.library] = {
            library: item.library,
            trend: [],
          };
        }

        popularityTrendMap[item.library].trend.push({
          date: item.date,
          subscribers: parseInt(item.count, 10),
        });
      });

      const popularityTrend: LibraryTrend[] = Object.values(popularityTrendMap);

      // 기간별 구독자 추세 데이터 조회
      // 1. 빈 데이터 준비
      const emptyYearlyData = this.generateEmptyYearlySubscriptionData(5);
      const emptyMonthlyData = this.generateEmptyMonthlySubscriptionData(5);
      const emptyWeeklyData = this.generateEmptyWeeklySubscriptionData();
      const emptyDailyData = this.generateEmptySubscriptionData(5);

      this.logger.debug(`빈 데이터 템플릿:
        연도별: ${JSON.stringify(emptyYearlyData)},
        월별: ${JSON.stringify(emptyMonthlyData)},
        주별: ${JSON.stringify(emptyWeeklyData)},
        일별: ${JSON.stringify(emptyDailyData)}
      `);

      // 2. 서재 ID와 이름 맵핑 생성
      const libraryMap = await this.libraryRepository
        .createQueryBuilder('library')
        .select('library.id', 'id')
        .addSelect('library.name', 'name')
        .where('library.ownerId = :userId', { userId })
        .getRawMany()
        .then((libraries) =>
          libraries.reduce((map, library) => {
            map[library.id] = library.name;
            return map;
          }, {}),
        );

      // 3. 연도별 데이터 조회
      const yearlyResult = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.id', 'libraryId')
        .addSelect("DATE_FORMAT(subscription.createdAt, '%Y')", 'year')
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .addGroupBy('year')
        .orderBy('count', 'DESC')
        .addOrderBy('year', 'ASC')
        .getRawMany();

      // 연도별 데이터 변환
      interface YearData {
        year: string;
        libraryStats: Array<{
          libraryId: number;
          library: string;
          subscribers: number;
        }>;
        libraries: Array<{
          library: string;
          subscribers: number;
        }>;
      }

      const yearlyStatsMap: Record<string, YearData> = {};

      // 빈 데이터로 초기 맵 생성
      emptyYearlyData.forEach((item) => {
        yearlyStatsMap[item.year] = {
          year: item.year,
          libraryStats: [],
          libraries: [],
        };
      });

      // 실제 데이터 추가
      yearlyResult.forEach((item) => {
        const year = item.year;
        const libraryId = parseInt(item.libraryId, 10);
        const library = libraryMap[libraryId] || `서재 ${libraryId}`;
        const subscribers = parseInt(item.count, 10);

        if (!yearlyStatsMap[year]) {
          yearlyStatsMap[year] = {
            year,
            libraryStats: [],
            libraries: [],
          };
        }

        yearlyStatsMap[year].libraryStats.push({
          libraryId,
          library,
          subscribers,
        });
      });

      // 각 연도별로 상위 5개 서재만 선별
      const yearly = Object.values(yearlyStatsMap).map((yearData) => {
        // 구독자 수 기준 내림차순 정렬
        const sortedStats = yearData.libraryStats.sort(
          (a, b) => b.subscribers - a.subscribers,
        );

        // 상위 5개만 선택
        const top5 = sortedStats.slice(0, 5);

        return {
          year: yearData.year,
          libraries:
            top5.length > 0
              ? top5.map((stat) => ({
                  library: stat.library,
                  subscribers: stat.subscribers,
                }))
              : [...topLibraries],
        };
      });

      // 4. 월별 데이터 조회 (최근 5개월)
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      const monthlyResult = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.id', 'libraryId')
        .addSelect("DATE_FORMAT(subscription.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .andWhere('subscription.createdAt >= :fiveMonthsAgo', { fiveMonthsAgo })
        .groupBy('library.id')
        .addGroupBy('month')
        .orderBy('count', 'DESC')
        .addOrderBy('month', 'ASC')
        .getRawMany();

      // 월별 데이터 변환
      interface MonthData {
        month: string;
        libraryStats: Array<{
          libraryId: number;
          library: string;
          subscribers: number;
        }>;
        libraries: Array<{
          library: string;
          subscribers: number;
        }>;
      }

      const monthlyStatsMap: Record<string, MonthData> = {};

      // 빈 데이터로 초기 맵 생성
      emptyMonthlyData.forEach((item) => {
        monthlyStatsMap[item.month] = {
          month: item.month,
          libraryStats: [],
          libraries: [],
        };
      });

      // 실제 데이터 추가
      monthlyResult.forEach((item) => {
        const month = item.month;
        const libraryId = parseInt(item.libraryId, 10);
        const library = libraryMap[libraryId] || `서재 ${libraryId}`;
        const subscribers = parseInt(item.count, 10);

        if (!monthlyStatsMap[month]) {
          monthlyStatsMap[month] = {
            month,
            libraryStats: [],
            libraries: [],
          };
        }

        monthlyStatsMap[month].libraryStats.push({
          libraryId,
          library,
          subscribers,
        });
      });

      // 각 월별로 상위 5개 서재만 선별
      const monthly = Object.values(monthlyStatsMap)
        .sort((a, b) => (a.month < b.month ? -1 : 1))
        .map((monthData) => {
          // 구독자 수 기준 내림차순 정렬
          const sortedStats = monthData.libraryStats.sort(
            (a, b) => b.subscribers - a.subscribers,
          );

          // 상위 5개만 선택
          const top5 = sortedStats.slice(0, 5);

          return {
            month: monthData.month,
            libraries:
              top5.length > 0
                ? top5.map((stat) => ({
                    library: stat.library,
                    subscribers: stat.subscribers,
                  }))
                : [...topLibraries],
          };
        });

      // 5. 주별 데이터 (최근 5주)
      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 = 35일

      const weeklyResult = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.id', 'libraryId')
        .addSelect(
          "CONCAT(MONTH(subscription.createdAt), '월 ', FLOOR((DAY(subscription.createdAt) - 1) / 7) + 1, '째주')",
          'week',
        )
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .andWhere('subscription.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('library.id')
        .addGroupBy('week')
        .orderBy('count', 'DESC')
        .getRawMany();

      // 주별 데이터 변환 및 상위 5개 서재 선별
      const weeklyStatsMap = {};

      // 빈 데이터로 초기화
      emptyWeeklyData.forEach((item) => {
        weeklyStatsMap[item.week] = {
          week: item.week,
          libraryStats: [],
          libraries: [],
        };
      });

      // 실제 데이터 추가
      weeklyResult.forEach((item) => {
        const week = item.week;
        const libraryId = parseInt(item.libraryId, 10);
        const library = libraryMap[libraryId] || `서재 ${libraryId}`;
        const subscribers = parseInt(item.count, 10);

        if (!weeklyStatsMap[week]) {
          weeklyStatsMap[week] = {
            week,
            libraryStats: [],
            libraries: [],
          };
        }

        weeklyStatsMap[week].libraryStats.push({
          libraryId,
          library,
          subscribers,
        });
      });

      // 각 주별로 상위 5개 서재만 선별
      const weekly = Object.values(weeklyStatsMap).map((weekData: any) => {
        // 구독자 수 기준 내림차순 정렬
        const sortedStats = weekData.libraryStats.sort(
          (a, b) => b.subscribers - a.subscribers,
        );

        // 상위 5개만 선택
        const top5 = sortedStats.slice(0, 5);

        return {
          week: weekData.week,
          libraries:
            top5.length > 0
              ? top5.map((stat) => ({
                  library: stat.library,
                  subscribers: stat.subscribers,
                }))
              : [...topLibraries],
        };
      });

      // 6. 일별 데이터 (최근 5일)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const dailyResult = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.id', 'libraryId')
        .addSelect("DATE_FORMAT(subscription.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .andWhere('subscription.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
        .groupBy('library.id')
        .addGroupBy('date')
        .orderBy('count', 'DESC')
        .addOrderBy('date', 'ASC')
        .getRawMany();

      // 일별 데이터 변환 및 상위 5개 서재 선별
      const dailyStatsMap = {};

      // 빈 데이터로 초기화
      for (let i = 0; i < 5; i++) {
        const date = new Date(fiveDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = this.formatDate(date);
        dailyStatsMap[dateStr] = {
          date: dateStr,
          libraryStats: [],
          libraries: [],
        };
      }

      // 실제 데이터 추가
      dailyResult.forEach((item) => {
        const date = item.date;
        const libraryId = parseInt(item.libraryId, 10);
        const library = libraryMap[libraryId] || `서재 ${libraryId}`;
        const subscribers = parseInt(item.count, 10);

        if (!dailyStatsMap[date]) {
          dailyStatsMap[date] = {
            date,
            libraryStats: [],
            libraries: [],
          };
        }

        dailyStatsMap[date].libraryStats.push({
          libraryId,
          library,
          subscribers,
        });
      });

      // 각 일별로 상위 5개 서재만 선별
      const daily = Object.values(dailyStatsMap)
        .sort((a: any, b: any) => (a.date < b.date ? -1 : 1))
        .map((dayData: any) => {
          // 구독자 수 기준 내림차순 정렬
          const sortedStats = dayData.libraryStats.sort(
            (a, b) => b.subscribers - a.subscribers,
          );

          // 상위 5개만 선택
          const top5 = sortedStats.slice(0, 5);

          return {
            date: dayData.date,
            libraries:
              top5.length > 0
                ? top5.map((stat) => ({
                    library: stat.library,
                    subscribers: stat.subscribers,
                  }))
                : [...topLibraries],
          };
        });

      this.logger.debug(`최종 결과:
        연도별: ${JSON.stringify(yearly)},
        월별: ${JSON.stringify(monthly)},
        주별: ${JSON.stringify(weekly)},
        일별: ${JSON.stringify(daily)}
      `);

      return {
        subscribersPerLibrary,
        mostPopularLibrary,
        popularityTrend,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`서재 인기도 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getLibraryUpdatePattern(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryUpdatePatternResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryUpdatePatternPublic) {
          return {
            updateFrequency: [],
            mostActiveLibrary: '',
            weekdayActivity: [],
            isPublic: false,
          };
        }
      }

      // 서재별 업데이트 빈도
      const updateFrequencyData = await this.libraryUpdateHistoryRepository
        .createQueryBuilder('history')
        .innerJoin('history.library', 'library')
        .select('library.name', 'library')
        .addSelect(
          'COUNT(history.id) / (DATEDIFF(NOW(), MIN(history.createdAt)) / 30)',
          'updatesPerMonth',
        )
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .having('COUNT(history.id) > 0')
        .orderBy('updatesPerMonth', 'DESC')
        .getRawMany();

      const updateFrequency = updateFrequencyData.map((item) => ({
        library: item.library,
        updatesPerMonth: parseFloat(item.updatesPerMonth) || 0,
      }));

      // 업데이트가 가장 활발한 서재
      let mostActiveLibrary = '없음';
      if (updateFrequency.length > 0) {
        mostActiveLibrary = updateFrequency[0].library;
      }

      // 요일별 서재 활동
      const weekdayActivityData = await this.libraryUpdateHistoryRepository
        .createQueryBuilder('history')
        .innerJoin('history.library', 'library')
        .select('DAYNAME(history.createdAt)', 'day')
        .addSelect('COUNT(history.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('day')
        .orderBy(
          "FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')",
        )
        .getRawMany();

      // 요일 한글 변환 맵
      const dayNameMap = {
        Monday: '월요일',
        Tuesday: '화요일',
        Wednesday: '수요일',
        Thursday: '목요일',
        Friday: '금요일',
        Saturday: '토요일',
        Sunday: '일요일',
      };

      const weekdayActivity = weekdayActivityData.map((item) => ({
        day: dayNameMap[item.day] || item.day,
        count: parseInt(item.count, 10),
      }));

      return {
        updateFrequency,
        mostActiveLibrary,
        weekdayActivity,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(
        `서재 업데이트 패턴 통계 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }
}
