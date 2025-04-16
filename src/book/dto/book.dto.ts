import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  IsDateString,
} from 'class-validator';
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
  readingStats?: ReadingStats;
  userReadingStatus?: string;
  userRating?: {
    bookId: number;
    rating: number;
    comment?: string;
  };
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
