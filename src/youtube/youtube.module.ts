import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YouTubeService } from './youtube.service';
import { YouTubeController } from './youtube.controller';
import { BookModule } from '../book/book.module';

@Module({
  imports: [ConfigModule, forwardRef(() => BookModule)],
  controllers: [YouTubeController],
  providers: [YouTubeService],
  exports: [YouTubeService],
})
export class YouTubeModule {}
