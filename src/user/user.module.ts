import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UserFollower } from './entities/user-follower.entity';
import { LibraryModule } from '../library/library.module';
import { ReviewModule } from '../review/review.module';
import { ReadingStatusModule } from '../reading-status/reading-status.module';
import { RatingModule } from '../rating/rating.module';
import { CommonModule } from '../common/common.module';
import { NotificationModule } from '../notification/notification.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { Review } from '../review/entities/review.entity';
import { ReviewImage } from '../review/entities/review-image.entity';
import { ReviewBook } from '../review/entities/review-book.entity';
import { Library } from '../library/entities/library.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { BookModule } from '../book/book.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserFollower,
      Review,
      ReviewImage,
      ReviewBook,
      Library,
      LibrarySubscription,
    ]),
    LibraryModule,
    forwardRef(() => ReviewModule),
    forwardRef(() => ReadingStatusModule),
    forwardRef(() => RatingModule),
    forwardRef(() => BookModule),
    CommonModule,
    NotificationModule,
    StatisticsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
