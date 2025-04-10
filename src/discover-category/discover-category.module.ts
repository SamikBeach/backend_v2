import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoverCategoryController } from './discover-category.controller';
import { DiscoverCategoryService } from './discover-category.service';
import { DiscoverCategory } from './entities/discover-category.entity';
import { DiscoverSubCategory } from './entities/discover-subcategory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiscoverCategory, DiscoverSubCategory])],
  controllers: [DiscoverCategoryController],
  providers: [DiscoverCategoryService],
  exports: [DiscoverCategoryService],
})
export class DiscoverCategoryModule {}
