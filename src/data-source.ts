import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import { User } from './user/entities/user.entity';
import { UserFollower } from './user/entities/user-follower.entity';
import { Category } from './category/entities/category.entity';
import { SubCategory } from './category/entities/subcategory.entity';
import { Book } from './book/entities/book.entity';
import { BookDiscoverCategory } from './book/entities/book-discover-category.entity';
import { DiscoverCategory } from './discover-category/entities/discover-category.entity';
import { DiscoverSubCategory } from './discover-category/entities/discover-subcategory.entity';
import { Library } from './library/entities/library.entity';
import { LibraryBook } from './library/entities/library-book.entity';
import { LibraryTag } from './library-tag/entities/library-tag.entity';
import { LibraryTagMapping } from './library/entities/library-tag-mapping.entity';
import { LibrarySubscription } from './library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from './library/entities/library-update-history.entity';
import { Review } from './review/entities/review.entity';
import { ReviewImage } from './review/entities/review-image.entity';
import { ReviewBook } from './review/entities/review-book.entity';
import { ReviewLike } from './review/entities/review-like.entity';
import { Comment } from './review/entities/comment.entity';
import { CommentLike } from './review/entities/comment-like.entity';
import { SearchLog, PopularSearch, RecentSearch } from './search/search.entity';
import { Notification } from './notification/entities/notification.entity';
import { ReadingStatus } from './reading-status/entities/reading-status.entity';
import { Rating } from './rating/entities/rating.entity';
import { UserStatisticsSetting } from './statistics/entities/user-statistics-setting.entity';
import { Feedback } from './feedback/entities/feedback.entity';

// 환경변수 로드
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
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
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // 마이그레이션 사용 시 false로 설정
  namingStrategy: new SnakeNamingStrategy(),
});
