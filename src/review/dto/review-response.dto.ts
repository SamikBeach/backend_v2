import { ReviewType } from '../entities/review.entity';

export class ReviewResponseDto {
  id: number;
  content: string;
  type: ReviewType;
  author: {
    id: number;
    username: string;
    email: string;
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
  }[];
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
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentResponseDto[];
}
