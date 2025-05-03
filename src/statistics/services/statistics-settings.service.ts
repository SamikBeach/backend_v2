import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import {
  StatisticsSettingResponseDto,
  UpdateStatisticsSettingDto,
} from '../dto/statistics-setting.dto';

@Injectable()
export class StatisticsSettingsService {
  private readonly logger = new Logger(StatisticsSettingsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
  ) {}

  async getOrCreateUserStatisticsSetting(
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

  async updateUserStatisticsSetting(
    userId: number,
    updateDto: UpdateStatisticsSettingDto,
  ): Promise<StatisticsSettingResponseDto> {
    try {
      const setting = await this.getOrCreateUserStatisticsSetting(userId);

      // 필드 업데이트
      Object.assign(setting, updateDto);

      await this.userStatisticsSettingRepository.save(setting);

      return this.mapToStatisticsSettingResponseDto(setting);
    } catch (error) {
      this.logger.error(`통계 설정 업데이트 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getUserStatisticsSettings(
    userId: number,
  ): Promise<StatisticsSettingResponseDto> {
    try {
      const setting = await this.getOrCreateUserStatisticsSetting(userId);
      return this.mapToStatisticsSettingResponseDto(setting);
    } catch (error) {
      this.logger.error(`통계 설정 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  mapToStatisticsSettingResponseDto(
    setting: UserStatisticsSetting,
  ): StatisticsSettingResponseDto {
    return {
      isReadingStatusPublic: setting.isReadingStatusPublic,
      isReadingStatusByPeriodPublic: setting.isReadingStatusByPeriodPublic,
      isGenreAnalysisPublic: setting.isGenreAnalysisPublic,
      isAuthorPublisherStatsPublic: setting.isAuthorPublisherStatsPublic,
      isReviewStatsPublic: setting.isReviewStatsPublic,
      isRatingStatsPublic: setting.isRatingStatsPublic,
      isActivityFrequencyPublic: setting.isActivityFrequencyPublic,
      isRatingHabitsPublic: setting.isRatingHabitsPublic,
      isUserInteractionPublic: setting.isUserInteractionPublic,
      isFollowerStatsPublic: setting.isFollowerStatsPublic,
      isCommunityActivityPublic: setting.isCommunityActivityPublic,
      isReviewInfluencePublic: setting.isReviewInfluencePublic,
      isLibraryCompositionPublic: setting.isLibraryCompositionPublic,
      isLibraryPopularityPublic: setting.isLibraryPopularityPublic,
      isLibraryUpdatePatternPublic: setting.isLibraryUpdatePatternPublic,
      isSearchActivityPublic: setting.isSearchActivityPublic,
    };
  }
}
