import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryTagController } from './library-tag.controller';
import { LibraryTagService } from './library-tag.service';
import { LibraryTag } from './entities/library-tag.entity';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LibraryTag]),
    forwardRef(() => LibraryModule),
  ],
  controllers: [LibraryTagController],
  providers: [LibraryTagService],
  exports: [LibraryTagService],
})
export class LibraryTagModule {}
