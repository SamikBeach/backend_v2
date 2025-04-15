import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingStatusController } from './reading-status.controller';
import { ReadingStatusService } from './reading-status.service';
import { ReadingStatus } from './entities/reading-status.entity';
import { Book } from '../book/entities/book.entity';
import { BookModule } from '../book/book.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReadingStatus, Book]),
    forwardRef(() => BookModule),
  ],
  controllers: [ReadingStatusController],
  providers: [ReadingStatusService],
  exports: [ReadingStatusService],
})
export class ReadingStatusModule {}
