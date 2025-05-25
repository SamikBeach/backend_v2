import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { UserFollower } from './user/entities/user-follower.entity';
import { CommonModule } from './common/common.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { CategoryModule } from './category/category.module';
import { BookModule } from './book/book.module';
import { Category } from './category/entities/category.entity';
import { SubCategory } from './category/entities/subcategory.entity';
import { Book } from './book/entities/book.entity';
import { BookDiscoverCategory } from './book/entities/book-discover-category.entity';
import { DiscoverCategoryModule } from './discover-category/discover-category.module';
import { DiscoverCategory } from './discover-category/entities/discover-category.entity';
import { DiscoverSubCategory } from './discover-category/entities/discover-subcategory.entity';
import { LibraryModule } from './library/library.module';
import { Library } from './library/entities/library.entity';
import { LibraryBook } from './library/entities/library-book.entity';
import { LibraryTagMapping } from './library/entities/library-tag-mapping.entity';
import { LibraryTag } from './library-tag/entities/library-tag.entity';
import { LibrarySubscription } from './library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from './library/entities/library-update-history.entity';
import { ReviewModule } from './review/review.module';
import { Review } from './review/entities/review.entity';
import { ReviewImage } from './review/entities/review-image.entity';
import { ReviewBook } from './review/entities/review-book.entity';
import { ReviewLike } from './review/entities/review-like.entity';
import { Comment } from './review/entities/comment.entity';
import { CommentLike } from './review/entities/comment-like.entity';
import { SearchModule } from './search/search.module';
import { SearchLog, PopularSearch, RecentSearch } from './search/search.entity';
import { NotificationModule } from './notification/notification.module';
import { Notification } from './notification/entities/notification.entity';
import { ReadingStatus } from './reading-status/entities/reading-status.entity';
import { RatingModule } from './rating/rating.module';
import { ReadingStatusModule } from './reading-status/reading-status.module';
import { Rating } from './rating/entities/rating.entity';
import { LibraryTagModule } from './library-tag/library-tag.module';
import { StatisticsModule } from './statistics/statistics.module';
import { UserStatisticsSetting } from './statistics/entities/user-statistics-setting.entity';
import { FeedbackModule } from './feedback/feedback.module';
import { Feedback } from './feedback/entities/feedback.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheConfigService } from './common/services/cache-config.service';
import { YouTubeModule } from './youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfigService,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          User,
          UserFollower,
          Category,
          SubCategory,
          Book,
          BookDiscoverCategory,
          DiscoverCategory,
          DiscoverSubCategory,
          Library,
          LibraryBook,
          LibraryTag,
          LibraryTagMapping,
          LibrarySubscription,
          LibraryUpdateHistory,
          Review,
          ReviewImage,
          ReviewBook,
          ReviewLike,
          Comment,
          CommentLike,
          SearchLog,
          PopularSearch,
          RecentSearch,
          Notification,
          ReadingStatus,
          Rating,
          UserStatisticsSetting,
          Feedback,
        ],
        synchronize: false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    AuthModule,
    UserModule,
    CommonModule,
    CategoryModule,
    BookModule,
    DiscoverCategoryModule,
    LibraryModule,
    LibraryTagModule,
    ReviewModule,
    SearchModule,
    NotificationModule,
    RatingModule,
    ReadingStatusModule,
    StatisticsModule,
    FeedbackModule,
    YouTubeModule,
  ],
  providers: [CacheConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
