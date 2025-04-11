import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PostType } from '../entities/post.entity';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(['general', 'discussion', 'review', 'question', 'meetup'])
  @IsOptional()
  type?: PostType;

  @IsArray()
  @IsOptional()
  bookIds?: number[];
}
