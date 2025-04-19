import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryTag } from '../library-tag/entities/library-tag.entity';
import { LibrarySubscription } from './entities/library-subscription.entity';
import { LibraryUpdateHistory } from './entities/library-update-history.entity';
import { LibraryTagMapping } from './entities/library-tag-mapping.entity';
import { BookModule } from '../book/book.module';
import { UserModule } from '../user/user.module';
import { LibraryTagModule } from '../library-tag/library-tag.module';
import { NotificationModule } from '../notification/notification.module';
import { ReadingStatusModule } from '../reading-status/reading-status.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Library,
      LibraryBook,
      LibraryTag,
      LibraryTagMapping,
      LibrarySubscription,
      LibraryUpdateHistory,
    ]),
    BookModule,
    UserModule,
    forwardRef(() => LibraryTagModule),
    NotificationModule,
    ReadingStatusModule,
    RatingModule,
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
