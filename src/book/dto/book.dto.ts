import { ApiProperty } from '@nestjs/swagger';
import { Book } from '../entities/book.entity';

export class BookDto {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  categoryId: number;
  subcategoryId: number;
  rating?: number;
  reviews?: number;
  totalRatings?: number;
  description?: string;
  publishDate?: Date;
  publisher: string;
  translator?: string;
  pageCount?: number;
  isbn: string;
  isbn13?: string;
  tags?: string[];
  isFeatured?: boolean;
  isDiscovered?: boolean;
}

export class CreateBookDto {
  title: string;
  author: string;
  coverImage: string;
  categoryId: number;
  subcategoryId: number;
  rating?: number;
  reviews?: number;
  totalRatings?: number;
  description?: string;
  publishDate?: Date;
  publisher: string;
  translator?: string;
  pageCount?: number;
  isbn: string;
  isbn13?: string;
  tags?: string[];
  isFeatured?: boolean;
  isDiscovered?: boolean;
}

export class UpdateBookDto {
  title?: string;
  author?: string;
  coverImage?: string;
  categoryId?: number;
  subcategoryId?: number;
  rating?: number;
  reviews?: number;
  totalRatings?: number;
  description?: string;
  publishDate?: Date;
  publisher?: string;
  translator?: string;
  pageCount?: number;
  isbn?: string;
  isbn13?: string;
  tags?: string[];
  isFeatured?: boolean;
  isDiscovered?: boolean;
}

/**
 * 읽기 상태 통계 정보를 포함한 확장된 책 응답 DTO
 */
export interface ReadingStats {
  currentReaders: number;
  completedReaders: number;
  averageReadingTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  readingStatusCounts: Record<string, number>;
}

/**
 * 확장된 책 정보 응답 DTO (읽기 상태 및 평점 정보 포함)
 */
export interface BookResponse extends Book {
  searchId?: number;
  bookId?: number;
  readingStats?: ReadingStats;
  userReadingStatus?: string;
  userRating?: {
    bookId: number;
    rating: number;
    comment?: string;
  };
  searchTerm?: string;
  searchedAt?: Date;
}

/**
 * 검색 결과 응답 DTO
 */
export interface BookSearchResponse {
  books: BookResponse[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Swagger 문서화를 위한 읽기 상태 통계 정보 DTO
 */
export class ReadingStatsDto {
  @ApiProperty({ description: '현재 읽고 있는 독자 수' })
  currentReaders: number;

  @ApiProperty({ description: '완독한 독자 수' })
  completedReaders: number;

  @ApiProperty({ description: '평균 읽기 소요 시간' })
  averageReadingTime: string;

  @ApiProperty({ description: '난이도', enum: ['easy', 'medium', 'hard'] })
  difficulty: 'easy' | 'medium' | 'hard';

  @ApiProperty({ description: '읽기 상태별 독자 수 통계' })
  readingStatusCounts: Record<string, number>;
}

/**
 * Swagger 문서화를 위한 확장된 책 정보 응답 DTO
 */
export class BookResponseDto {
  @ApiProperty({ description: '도서 ID' })
  id: number;

  @ApiProperty({ description: '제목' })
  title: string;

  @ApiProperty({ description: '저자' })
  author: string;

  @ApiProperty({ description: '표지 이미지 URL' })
  coverImage: string;

  @ApiProperty({ description: '표지 이미지 가로 크기', required: false })
  coverImageWidth?: number;

  @ApiProperty({ description: '표지 이미지 세로 크기', required: false })
  coverImageHeight?: number;

  @ApiProperty({ description: '카테고리 정보', required: false })
  category?: any;

  @ApiProperty({ description: '서브카테고리 정보', required: false })
  subcategory?: any;

  @ApiProperty({ description: '별점 (5점 만점)', required: false })
  rating?: number;

  @ApiProperty({ description: '리뷰 수', required: false })
  reviews?: number;

  @ApiProperty({ description: '출판사', required: false })
  publisher?: string;

  @ApiProperty({ description: '출판일', required: false })
  publishDate?: Date;

  @ApiProperty({ description: '책 설명', required: false })
  description?: string;

  @ApiProperty({ description: 'ISBN', required: false })
  isbn?: string;

  @ApiProperty({ description: 'ISBN13', required: false })
  isbn13?: string;

  @ApiProperty({
    description: '읽기 상태 통계',
    required: false,
    type: ReadingStatsDto,
  })
  readingStats?: ReadingStatsDto;

  @ApiProperty({ description: '사용자의 읽기 상태', required: false })
  userReadingStatus?: string;

  @ApiProperty({ description: '사용자의 평점 정보', required: false })
  userRating?: {
    bookId: number;
    rating: number;
    comment?: string;
  };
}

/**
 * Swagger 문서화를 위한 검색 결과 응답 DTO
 */
export class BookSearchResponseDto {
  @ApiProperty({ type: [BookResponseDto], description: '책 목록' })
  books: BookResponseDto[];

  @ApiProperty({ description: '전체 결과 수' })
  total: number;

  @ApiProperty({ description: '현재 페이지 번호' })
  page: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPages: number;
}
