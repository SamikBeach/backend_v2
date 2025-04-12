import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { CommonModule } from '../common/common.module';
import { CategoryModule } from '../category/category.module';
import { DiscoverCategoryModule } from '../discover-category/discover-category.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book]),
    CommonModule,
    CategoryModule,
    DiscoverCategoryModule,
    forwardRef(() => SearchModule),
  ],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
