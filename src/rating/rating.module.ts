import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { Rating } from './entities/rating.entity';
import { Book } from '../book/entities/book.entity';
import { BookModule } from '../book/book.module';
import { ReadingStatusModule } from '../reading-status/reading-status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, Book]),
    forwardRef(() => BookModule),
    forwardRef(() => ReadingStatusModule),
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
