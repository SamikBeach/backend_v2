import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PopularSearch, RecentSearch, SearchLog } from './search.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchLog, PopularSearch, RecentSearch])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
