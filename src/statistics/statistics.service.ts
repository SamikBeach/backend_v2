import { Injectable, Logger } from '@nestjs/common';
import {
  StatisticsSettingResponseDto,
  UpdateStatisticsSettingDto,
} from './dto/statistics-setting.dto';
import {
  ReadingStatusStatsResponseDto,
  GenreAnalysisResponseDto,
  AuthorPublisherStatsResponseDto,
  ReadingStatusByPeriodResponseDto,
} from './dto/reading-status-statistics.dto';
import {
  ReviewStatsResponseDto,
  RatingStatsResponseDto,
  ActivityFrequencyResponseDto,
  RatingHabitsResponseDto,
} from './dto/review-rating-statistics.dto';
import {
  UserInteractionResponseDto,
  FollowerStatsResponseDto,
  CommunityActivityResponseDto,
  ReviewInfluenceResponseDto,
} from './dto/community-activity-statistics.dto';
import {
  LibraryCompositionResponseDto,
  LibraryPopularityResponseDto,
  LibraryUpdatePatternResponseDto,
} from './dto/library-statistics.dto';
import {
  SearchActivityResponseDto,
  RecentPopularSearchDto,
} from './dto/misc-statistics.dto';
import { ReadingStatusStatisticsService } from './services/reading-status-statistics.service';
import { ReviewRatingStatisticsService } from './services/review-rating-statistics.service';
import { CommunityActivityStatisticsService } from './services/community-activity-statistics.service';
import { LibraryStatisticsService } from './services/library-statistics.service';
import { MiscStatisticsService } from './services/misc-statistics.service';
import { StatisticsSettingsService } from './services/statistics-settings.service';
import { UserStatisticsSetting } from './entities/user-statistics-setting.entity';

/**
 * 통계 서비스
 *
 * 이 클래스는 여러 전문화된 통계 서비스에 대한 파사드(Facade) 역할을 합니다.
 * 모든 실제 구현은 각각의 전문화된 서비스 클래스에 위임합니다.
 */
@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    private readonly readingStatusStatisticsService: ReadingStatusStatisticsService,
    private readonly reviewRatingStatisticsService: ReviewRatingStatisticsService,
    private readonly communityActivityStatisticsService: CommunityActivityStatisticsService,
    private readonly libraryStatisticsService: LibraryStatisticsService,
    private readonly miscStatisticsService: MiscStatisticsService,
    private readonly statisticsSettingsService: StatisticsSettingsService,
  ) {}

  // 통계 설정 관련 메서드 - StatisticsSettingsService로 위임
  async getOrCreateUserStatisticsSetting(
    userId: number,
  ): Promise<UserStatisticsSetting> {
    return this.statisticsSettingsService.getOrCreateUserStatisticsSetting(
      userId,
    );
  }

  async updateUserStatisticsSetting(
    userId: number,
    updateDto: UpdateStatisticsSettingDto,
  ): Promise<StatisticsSettingResponseDto> {
    return this.statisticsSettingsService.updateUserStatisticsSetting(
      userId,
      updateDto,
    );
  }

  async getUserStatisticsSettings(
    userId: number,
  ): Promise<StatisticsSettingResponseDto> {
    return this.statisticsSettingsService.getUserStatisticsSettings(userId);
  }

  // 독서 통계 메서드 - ReadingStatusStatisticsService로 위임
  async getReadingStatusStats(
    userId: number,
    requestUserId?: number,
  ): Promise<ReadingStatusStatsResponseDto> {
    return this.readingStatusStatisticsService.getReadingStatusStats(
      userId,
      requestUserId,
    );
  }

  async getGenreAnalysis(
    userId: number,
    requestUserId?: number,
  ): Promise<GenreAnalysisResponseDto> {
    return this.readingStatusStatisticsService.getGenreAnalysis(
      userId,
      requestUserId,
    );
  }

  async getAuthorPublisherStats(
    userId: number,
    requestUserId?: number,
  ): Promise<AuthorPublisherStatsResponseDto> {
    return this.readingStatusStatisticsService.getAuthorPublisherStats(
      userId,
      requestUserId,
    );
  }

  async getReadingStatusByPeriod(
    userId: number,
    requestUserId?: number,
  ): Promise<ReadingStatusByPeriodResponseDto> {
    return this.readingStatusStatisticsService.getReadingStatusByPeriod(
      userId,
      requestUserId,
    );
  }

  // 리뷰 통계 메서드 - ReviewRatingStatisticsService로 위임
  async getReviewStats(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewStatsResponseDto> {
    return this.reviewRatingStatisticsService.getReviewStats(
      userId,
      requestUserId,
    );
  }

  async getRatingStats(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingStatsResponseDto> {
    return this.reviewRatingStatisticsService.getRatingStats(
      userId,
      requestUserId,
    );
  }

  async getActivityFrequency(
    userId: number,
    requestUserId?: number,
  ): Promise<ActivityFrequencyResponseDto> {
    return this.reviewRatingStatisticsService.getActivityFrequency(
      userId,
      requestUserId,
    );
  }

  async getRatingHabits(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingHabitsResponseDto> {
    return this.reviewRatingStatisticsService.getRatingHabits(
      userId,
      requestUserId,
    );
  }

  // 커뮤니티 활동 메서드 - CommunityActivityStatisticsService로 위임
  async getUserInteraction(
    userId: number,
    requestUserId?: number,
  ): Promise<UserInteractionResponseDto> {
    return this.communityActivityStatisticsService.getUserInteraction(
      userId,
      requestUserId,
    );
  }

  async getFollowerStats(
    userId: number,
    requestUserId?: number,
  ): Promise<FollowerStatsResponseDto> {
    return this.communityActivityStatisticsService.getFollowerStats(
      userId,
      requestUserId,
    );
  }

  async getCommunityActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<CommunityActivityResponseDto> {
    return this.communityActivityStatisticsService.getCommunityActivity(
      userId,
      requestUserId,
    );
  }

  async getReviewInfluence(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewInfluenceResponseDto> {
    return this.communityActivityStatisticsService.getReviewInfluence(
      userId,
      requestUserId,
    );
  }

  // 서재 관련 메서드 - LibraryStatisticsService로 위임
  async getLibraryComposition(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryCompositionResponseDto> {
    return this.libraryStatisticsService.getLibraryComposition(
      userId,
      requestUserId,
    );
  }

  async getLibraryPopularity(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryPopularityResponseDto> {
    return this.libraryStatisticsService.getLibraryPopularity(
      userId,
      requestUserId,
    );
  }

  async getLibraryUpdatePattern(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryUpdatePatternResponseDto> {
    return this.libraryStatisticsService.getLibraryUpdatePattern(
      userId,
      requestUserId,
    );
  }

  // 검색 활동 관련 메서드 - MiscStatisticsService로 위임
  async getSearchActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<SearchActivityResponseDto> {
    return this.miscStatisticsService.getSearchActivity(userId, requestUserId);
  }

  async getRecentPopularSearches(
    limit = 10,
  ): Promise<RecentPopularSearchDto[]> {
    return this.miscStatisticsService.getRecentPopularSearches(limit);
  }
}
