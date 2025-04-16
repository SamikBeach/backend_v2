import { ApiProperty } from '@nestjs/swagger';
import {
  Max,
  Min,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { User } from '../../user/entities/user.entity';
import { Book } from '../../book/entities/book.entity';

export class CreateRatingDto {
  @ApiProperty({
    description: '평점 (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: '평점에 대한 코멘트 (선택사항)',
    example: '이 책은 정말 훌륭한 내용을 담고 있습니다.',
    required: false,
  })
  comment?: string;

  @ApiProperty({
    description: 'ISBN 또는 ISBN13 (선택사항, bookId가 -1일 때 사용)',
    example: '9788901234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  isbn?: string;
}

export class UpdateRatingDto extends PartialType(CreateRatingDto) {}

export class RatingResponseDto {
  @ApiProperty({
    description: '평점 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '사용자 ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: '책 ID',
    example: 1,
  })
  bookId: number;

  @ApiProperty({
    description: '평점 (1-5)',
    example: 4,
  })
  rating: number;

  @ApiProperty({
    description: '평점에 대한 코멘트',
    example: '이 책은 정말 훌륭한 내용을 담고 있습니다.',
    nullable: true,
  })
  comment: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2023-08-15T14:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2023-08-15T14:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: '사용자 정보',
    required: false,
  })
  user?: Partial<User>;

  @ApiProperty({
    description: '책 정보',
    required: false,
  })
  book?: Partial<Book>;
}
