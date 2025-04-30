import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_statistics_setting')
export class UserStatisticsSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 독서 통계 공개 설정
  @Column({ default: true })
  isReadingStatusPublic: boolean;

  @Column({ default: true })
  isReadingStatusByPeriodPublic: boolean;

  @Column({ default: true })
  isGenreAnalysisPublic: boolean;

  @Column({ default: true })
  isAuthorPublisherStatsPublic: boolean;

  // 독서 활동 통계 공개 설정
  @Column({ default: true })
  isReviewStatsPublic: boolean;

  @Column({ default: true })
  isRatingStatsPublic: boolean;

  @Column({ default: true })
  isActivityFrequencyPublic: boolean;

  @Column({ default: true })
  isRatingHabitsPublic: boolean;

  // 커뮤니티 활동 통계 공개 설정
  @Column({ default: true })
  isUserInteractionPublic: boolean;

  @Column({ default: true })
  isFollowerStatsPublic: boolean;

  @Column({ default: true })
  isCommentActivityPublic: boolean;

  @Column({ default: true })
  isReviewInfluencePublic: boolean;

  // 서재 통계 공개 설정
  @Column({ default: true })
  isLibraryCompositionPublic: boolean;

  @Column({ default: true })
  isLibraryPopularityPublic: boolean;

  @Column({ default: true })
  isLibraryUpdatePatternPublic: boolean;

  @Column({ default: true })
  isLibraryDiversityPublic: boolean;

  // 기타 통계 공개 설정
  @Column({ default: true })
  isAmountStatsPublic: boolean;

  @Column({ default: true })
  isSearchActivityPublic: boolean;

  @Column({ default: true })
  isBookMetadataStatsPublic: boolean;
}
