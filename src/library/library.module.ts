import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryTag } from './entities/library-tag.entity';
import { LibrarySubscription } from './entities/library-subscription.entity';
import { LibraryUpdateHistory } from './entities/library-update-history.entity';
import { Tag } from './entities/tag.entity';
import { BookModule } from '../book/book.module';
import { UserModule } from '../user/user.module';
import { TagModule } from '../tag/tag.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Library,
      LibraryBook,
      LibraryTag,
      LibrarySubscription,
      LibraryUpdateHistory,
      Tag,
    ]),
    BookModule,
    UserModule,
    forwardRef(() => TagModule),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
