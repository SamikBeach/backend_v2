import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PopularSearch, RecentSearch, SearchLog } from './search.entity';
import { BookModule } from '../book/book.module';
import { ReadingStatusModule } from '../reading-status/reading-status.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SearchLog, PopularSearch, RecentSearch]),
    forwardRef(() => BookModule),
    forwardRef(() => ReadingStatusModule),
    forwardRef(() => RatingModule),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
