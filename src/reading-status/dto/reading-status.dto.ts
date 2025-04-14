import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ReadingStatusType } from '../entities/reading-status.entity';
import { Type } from 'class-transformer';

export class CreateReadingStatusDto {
  @ApiProperty({
    enum: ReadingStatusType,
    example: ReadingStatusType.READING,
    description: '읽기 상태 (읽고 싶어요, 읽는 중, 읽었어요)',
    required: false,
  })
  @IsOptional()
  @IsEnum(ReadingStatusType)
  status?: ReadingStatusType;

  @ApiProperty({
    example: 100,
    description: '현재 읽고 있는 페이지',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  currentPage?: number;

  @ApiProperty({
    example: '2023-01-01',
    description: '독서 시작 날짜',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    example: '2023-02-01',
    description: '독서 완료 날짜',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  finishDate?: Date;

  @ApiProperty({
    example: '인상 깊었던 부분: 주인공의 성장과정',
    description: '독서 메모',
    required: false,
  })
  @IsOptional()
  @IsString()
  readingMemo?: string;
}

export class UpdateReadingStatusDto {
  @ApiProperty({
    enum: ReadingStatusType,
    example: ReadingStatusType.READ,
    description: '읽기 상태 (읽고 싶어요, 읽는 중, 읽었어요)',
    required: false,
  })
  @IsOptional()
  @IsEnum(ReadingStatusType)
  status?: ReadingStatusType;

  @ApiProperty({
    example: 150,
    description: '현재 읽고 있는 페이지',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  currentPage?: number;

  @ApiProperty({
    example: '2023-01-01',
    description: '독서 시작 날짜',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    example: '2023-02-01',
    description: '독서 완료 날짜',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  finishDate?: Date;

  @ApiProperty({
    example: '인상 깊었던 부분: 주인공의 성장과정',
    description: '독서 메모',
    required: false,
  })
  @IsOptional()
  @IsString()
  readingMemo?: string;
}

export class BookInfoDto {
  @ApiProperty({ example: 1, description: '책 ID' })
  id: number;

  @ApiProperty({ example: '우주의 끝에서 온 노래', description: '책 제목' })
  title: string;

  @ApiProperty({ example: '정보라', description: '책 저자' })
  author: string;

  @ApiProperty({
    example: 'https://example.com/cover.jpg',
    description: '책 표지 이미지 URL',
  })
  coverImageUrl: string;

  @ApiProperty({
    example: '9788901234567',
    description: 'ISBN',
  })
  isbn: string;
}

export class ReadingStatusResponseDto {
  @ApiProperty({ example: 1, description: '읽기 상태 ID' })
  id: number;

  @ApiProperty({
    enum: ReadingStatusType,
    example: ReadingStatusType.READING,
    description: '읽기 상태',
  })
  status: ReadingStatusType;

  @ApiProperty({
    example: 100,
    description: '현재 읽고 있는 페이지',
    required: false,
  })
  currentPage?: number;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '독서 시작 날짜',
  })
  startDate?: Date;

  @ApiProperty({
    example: '2023-02-01T00:00:00.000Z',
    description: '독서 완료 날짜',
  })
  finishDate?: Date;

  @ApiProperty({
    example: '인상 깊었던 부분: 주인공의 성장과정',
    description: '독서 메모',
  })
  readingMemo?: string;

  @ApiProperty({
    description: '생성 시간',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 시간',
  })
  updatedAt: Date;

  @ApiProperty({
    type: BookInfoDto,
    description: '책 정보',
  })
  book: BookInfoDto;
}

export class BookReadingStatusDto {
  @ApiProperty({ example: 1, description: '책 ID' })
  bookId: number;

  @ApiProperty({ example: '우주의 끝에서 온 노래', description: '책 제목' })
  title: string;

  @ApiProperty({ example: '정보라', description: '책 저자' })
  author: string;

  @ApiProperty({
    example: 'https://example.com/cover.jpg',
    description: '책 표지 이미지 URL',
  })
  coverImageUrl: string;

  @ApiProperty({
    description: '읽기 상태별 수',
    example: {
      want_to_read: 15,
      reading: 10,
      read: 20,
    },
  })
  readingStatusCounts: Record<ReadingStatusType, number>;

  @ApiProperty({
    enum: ReadingStatusType,
    example: ReadingStatusType.READING,
    description: '현재 사용자의 읽기 상태',
    required: false,
  })
  userReadingStatus?: ReadingStatusType;

  @ApiProperty({
    example: 25,
    description: '현재 읽는 중인 사용자 수',
  })
  currentReaders: number;

  @ApiProperty({
    example: 150,
    description: '완독한 사용자 수',
  })
  completedReaders: number;

  @ApiProperty({
    example: '14일',
    description: '평균 독서 기간',
  })
  averageReadingTime: string;

  @ApiProperty({
    enum: ['easy', 'medium', 'hard'],
    example: 'medium',
    description: '책 난이도',
  })
  difficulty: 'easy' | 'medium' | 'hard';
}
