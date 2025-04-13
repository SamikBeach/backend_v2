import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewType } from '../entities/review.entity';

export class UpdateReviewDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(['general', 'discussion', 'review', 'question', 'meetup'])
  @IsOptional()
  type?: ReviewType;

  @IsArray()
  @IsOptional()
  bookIds?: number[];
}
