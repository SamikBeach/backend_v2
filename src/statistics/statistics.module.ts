import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { UserStatisticsSetting } from './entities/user-statistics-setting.entity';
import { ReadingStatus } from '../reading-status/entities/reading-status.entity';
import { Book } from '../book/entities/book.entity';
import { Review } from '../review/entities/review.entity';
import { Rating } from '../rating/entities/rating.entity';
import { User } from '../user/entities/user.entity';
import { UserFollower } from '../user/entities/user-follower.entity';
import { Comment } from '../review/entities/comment.entity';
import { ReviewLike } from '../review/entities/review-like.entity';
import { Library } from '../library/entities/library.entity';
import { LibraryBook } from '../library/entities/library-book.entity';
import { LibraryTagMapping } from '../library/entities/library-tag-mapping.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from '../library/entities/library-update-history.entity';
import {
  SearchLog,
  PopularSearch,
  RecentSearch,
} from '../search/search.entity';
import { Category } from '../category/entities/category.entity';
import { SubCategory } from '../category/entities/subcategory.entity';
import { ReadingStatusStatisticsService } from './services/reading-status-statistics.service';
import { ReviewRatingStatisticsService } from './services/review-rating-statistics.service';
import { CommunityActivityStatisticsService } from './services/community-activity-statistics.service';
import { LibraryStatisticsService } from './services/library-statistics.service';
import { MiscStatisticsService } from './services/misc-statistics.service';
import { StatisticsSettingsService } from './services/statistics-settings.service';
import { CommonStatisticsService } from './services/common-statistics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStatisticsSetting,
      ReadingStatus,
      Book,
      Review,
      Rating,
      User,
      UserFollower,
      Comment,
      ReviewLike,
      Library,
      LibraryBook,
      LibraryTagMapping,
      LibrarySubscription,
      LibraryUpdateHistory,
      SearchLog,
      PopularSearch,
      RecentSearch,
      Category,
      SubCategory,
    ]),
  ],
  providers: [
    StatisticsService,
    ReadingStatusStatisticsService,
    ReviewRatingStatisticsService,
    CommunityActivityStatisticsService,
    LibraryStatisticsService,
    MiscStatisticsService,
    StatisticsSettingsService,
    CommonStatisticsService,
  ],
  exports: [
    StatisticsService,
    ReadingStatusStatisticsService,
    ReviewRatingStatisticsService,
    CommunityActivityStatisticsService,
    LibraryStatisticsService,
    MiscStatisticsService,
    StatisticsSettingsService,
    CommonStatisticsService,
  ],
})
export class StatisticsModule {}
