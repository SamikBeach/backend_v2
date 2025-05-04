import { ReviewType } from '../entities/review.entity';

export class ReviewResponseDto {
  id: number;
  content: string;
  type: ReviewType;
  author: {
    id: number;
    username: string;
    email: string;
    profileImage?: string;
  };
  images: {
    id: number;
    url: string;
    caption?: string;
  }[];
  books: {
    id: number;
    title: string;
    author: string;
    coverImage: string;
    publisher: string;
    isbn?: string;
    isbn13?: string;
    publishDate?: Date;
    description?: string;
    rating?: number;
    reviews?: number;
    totalRatings?: number;
    readingStats?: any;
    userRating?: any;
    userReadingStatus?: string;
  }[];
  // 리뷰 작성자의 해당 책에 대한 평점 정보
  userRating?: {
    bookId: number;
    rating: number;
    comment?: string;
  };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CommentResponseDto {
  id: number;
  content: string;
  author: {
    id: number;
    username: string;
    profileImage?: string;
  };
  likeCount: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentResponseDto[];
}
