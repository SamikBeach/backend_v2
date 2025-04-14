import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingStatusController } from './reading-status.controller';
import { ReadingStatusService } from './reading-status.service';
import { ReadingStatus } from './entities/reading-status.entity';
import { Book } from '../book/entities/book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReadingStatus, Book])],
  controllers: [ReadingStatusController],
  providers: [ReadingStatusService],
  exports: [ReadingStatusService],
})
export class ReadingStatusModule {}
 