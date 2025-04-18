import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryTagController } from './library-tag.controller';
import { LibraryTagService } from './library-tag.service';
import { LibraryTag } from './entities/library-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryTag])],
  controllers: [LibraryTagController],
  providers: [LibraryTagService],
  exports: [LibraryTagService],
})
export class LibraryTagModule {}
