import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { UserFollower } from './entities/user-follower.entity';
import { ReadingStatusModule } from '../reading-status/reading-status.module';
import { CommonModule } from '../common/common.module';
import { Review } from '../review/entities/review.entity';
import { ReviewImage } from '../review/entities/review-image.entity';
import { ReviewBook } from '../review/entities/review-book.entity';
import { BookModule } from '../book/book.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserFollower,
      Review,
      ReviewImage,
      ReviewBook,
    ]),
    forwardRef(() => ReadingStatusModule),
    forwardRef(() => BookModule),
    forwardRef(() => RatingModule),
    CommonModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
