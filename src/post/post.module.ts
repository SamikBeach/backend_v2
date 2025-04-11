import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { PostService } from './post.service';
import { CommentService } from './comment.service';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { PostBook } from './entities/post-book.entity';
import { PostLike } from './entities/post-like.entity';
import { Comment } from './entities/comment.entity';
import { CommonModule } from '../common/common.module';
import { FileService } from '../common/services/file.service';
import { BookModule } from '../book/book.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostImage, PostBook, PostLike, Comment]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        // uploads 디렉토리가 없으면 생성
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: uploadPath,
            filename: (req, file, callback) => {
              const uniqueFilename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
              callback(null, uniqueFilename);
            },
          }),
          limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
          },
          fileFilter: (req, file, callback) => {
            // 이미지 파일만 허용
            if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif)$/)) {
              return callback(
                new Error('이미지 파일만 업로드할 수 있습니다.'),
                false,
              );
            }
            callback(null, true);
          },
        };
      },
    }),
    CommonModule,
    BookModule,
  ],
  controllers: [PostController],
  providers: [PostService, CommentService, FileService],
  exports: [PostService, CommentService],
})
export class PostModule {}
