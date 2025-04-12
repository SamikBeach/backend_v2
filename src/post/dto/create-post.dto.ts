import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PostType } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content: string;

  @IsEnum(['general', 'discussion', 'review', 'question', 'meetup'], {
    message: '유효하지 않은 게시물 타입입니다.',
  })
  type: PostType;

  @IsArray()
  @IsOptional()
  bookIds?: number[];
}
