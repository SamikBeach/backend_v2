import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ReviewType } from '../entities/review.entity';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content: string;

  @IsEnum(['general', 'discussion', 'review', 'question', 'meetup'], {
    message: '유효하지 않은 리뷰 타입입니다.',
  })
  type: ReviewType;

  @IsNumber()
  @IsOptional()
  bookId?: number;

  @IsString()
  @IsOptional()
  isbn?: string;
}
