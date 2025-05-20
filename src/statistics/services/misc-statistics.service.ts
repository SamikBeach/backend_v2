import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SearchLog,
  PopularSearch,
  RecentSearch,
} from '../../search/search.entity';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import {
  SearchActivityResponseDto,
  RecentPopularSearchDto,
} from '../dto/misc-statistics.dto';
import { CommonStatisticsService } from './common-statistics.service';

@Injectable()
export class MiscStatisticsService {
  private readonly logger = new Logger(MiscStatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(PopularSearch)
    private readonly popularSearchRepository: Repository<PopularSearch>,
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
    private readonly commonStatisticsService: CommonStatisticsService,
  ) {}

  async getSearchActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<SearchActivityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.userStatisticsSettingRepository.findOne({
          where: { userId },
        });
        if (!setting || !setting.isSearchActivityPublic) {
          return {
            searchCount: 0,
            topSearchTerms: [],
            frequentlySearchedTerms: [],
            searchPattern: '',
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 검색 횟수 조회
      const searchCount = await this.searchLogRepository.count({
        where: { userId },
      });

      // 사용자의 상위 검색어 조회 (최대 5개)
      const topSearchTermsResult = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select('searchLog.term')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .groupBy('searchLog.term')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

      const topSearchTerms = topSearchTermsResult.map((item) => ({
        term: item.term,
        count: parseInt(item.count),
      }));

      // 자주 검색하는 키워드 조회 (최대 10개)
      const frequentlySearchedTermsResult = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select('searchLog.term')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .groupBy('searchLog.term')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      // 디버깅용 로그 추가
      this.logger.debug(
        `frequentlySearchedTermsResult: ${JSON.stringify(frequentlySearchedTermsResult)}`,
      );

      const frequentlySearchedTerms = frequentlySearchedTermsResult.map(
        (item) => ({
          term: item.searchLog_term, // term 필드 이름 수정 (RawMany 결과값에 맞게)
          count: parseInt(item.count),
        }),
      );

      // 디버깅용 로그 추가
      // this.logger.debug(
      //   `frequentlySearchedTerms: ${JSON.stringify(frequentlySearchedTerms)}`,
      // );

      // 기간 설정
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      // 1. 연도별 검색 통계
      const yearlyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y')", 'year')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :fiveYearsAgo', { fiveYearsAgo })
        .groupBy('year')
        .orderBy('year', 'ASC')
        .getRawMany();

      const yearlyResult = this.commonStatisticsService.mergeAndSortData(
        this.generateEmptyYearlySearchData(),
        yearlyData.map((item) => ({
          year: item.year,
          count: parseInt(item.count),
        })),
        'year',
        5,
      );

      // 2. 월별 검색 통계
      const monthlyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyResult = this.commonStatisticsService.mergeAndSortData(
        this.generateEmptyMonthlySearchData(),
        monthlyData.map((item) => ({
          month: item.month,
          count: parseInt(item.count),
        })),
        'month',
        12,
      );

      // 3. 주별 검색 통계
      const weeklyEmptyData = this.generateEmptyWeeklySearchData();

      // 최근 5주의 시작일과 끝일 계산
      const weekRanges = [];
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        const endDate = new Date(now);
        endDate.setDate(now.getDate() - i * 7);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);

        weekRanges.push({
          start: startDate,
          end: endDate,
          key: i,
        });
      }

      const weeklyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      const weeklyDataMap = new Map();
      // weeklyEmptyData 초기화
      weeklyEmptyData.forEach((week) => {
        weeklyDataMap.set(week.week, { week: week.week, count: 0 });
      });

      // 날짜별 데이터를 주차에 할당
      weeklyData.forEach((item) => {
        const itemDate = new Date(item.date);

        // 어떤 주차 범위에 속하는지 확인
        for (let i = 0; i < weekRanges.length; i++) {
          const range = weekRanges[i];
          if (itemDate >= range.start && itemDate <= range.end) {
            const count = parseInt(item.count) || 0;
            const reversedIndex = 4 - i; // 인덱스를 반대로 처리
            const week = weeklyEmptyData[reversedIndex].week;

            const current = weeklyDataMap.get(week);
            if (current) {
              current.count += count;
              weeklyDataMap.set(week, current);
            }
            break;
          }
        }
      });

      const weeklyResult = Array.from(weeklyDataMap.values());

      // 4. 일별 검색 통계
      const dailyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :oneMonthAgo', { oneMonthAgo })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      const dailyResult = this.commonStatisticsService.mergeAndSortData(
        this.generateEmptyDailySearchData(),
        dailyData.map((item) => ({
          date: item.date,
          count: parseInt(item.count),
        })),
        'date',
        30,
      );

      // 월별 검색 패턴 분석
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlySearchCounts = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :sixMonthsAgo', { sixMonthsAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      // 검색 패턴 분석 (간단한 텍스트 설명)
      let searchPattern = '정기적으로 검색을 하고 있습니다.';

      if (searchCount === 0) {
        searchPattern = '아직 검색 활동이 없습니다.';
      } else if (monthlySearchCounts.length === 0) {
        searchPattern = '최근 6개월간 검색 활동이 없습니다.';
      } else if (monthlySearchCounts.length < 3) {
        searchPattern = '간헐적으로 검색을 사용하고 있습니다.';
      } else {
        // 최근 3개월 검색 증가/감소 추세 분석
        const recentMonths = monthlySearchCounts.slice(-3);
        if (recentMonths.length === 3) {
          const trend = this.commonStatisticsService.calculateTrend(
            recentMonths.map((m) => parseInt(m.count)),
          );
          if (trend > 0.2) {
            searchPattern = '검색 사용이 점차 증가하고 있습니다.';
          } else if (trend < -0.2) {
            searchPattern = '검색 사용이 점차 감소하고 있습니다.';
          }
        }
      }

      return {
        searchCount,
        topSearchTerms,
        frequentlySearchedTerms,
        searchPattern,
        yearly: yearlyResult,
        monthly: monthlyResult,
        weekly: weeklyResult,
        daily: dailyResult,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`검색 활동 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getRecentPopularSearches(
    limit = 10,
  ): Promise<RecentPopularSearchDto[]> {
    try {
      // PopularSearch 엔티티에서 최근 인기 검색어 가져오기
      const popularSearches = await this.popularSearchRepository.find({
        order: {
          count: 'DESC',
          updatedAt: 'DESC',
        },
        take: limit,
      });

      // DTO 형식으로 변환
      return popularSearches.map((search) => ({
        term: search.term,
        count: search.count,
      }));
    } catch (error) {
      this.logger.error(`인기 검색어 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // Helper methods for generating empty data templates
  private generateEmptyYearlySearchData(count = 5): {
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

  private generateEmptyMonthlySearchData(count = 12): {
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

  private generateEmptyWeeklySearchData(): {
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

  private generateEmptyDailySearchData(): {
    date: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 30일 전부터 현재까지
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - 29 + i);

      result.push({
        date: this.commonStatisticsService.formatDate(date),
        count: 0,
      });
    }

    return result;
  }
}
