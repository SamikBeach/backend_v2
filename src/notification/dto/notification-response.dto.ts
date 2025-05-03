import { NotificationType } from '../entities/notification.entity';

/**
 * 사용자 정보 DTO
 */
export class UserInfoDto {
  id: number;
  username: string;
  profileImage?: string;
  email?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
}

/**
 * 도서 정보 DTO
 */
export class BookInfoDto {
  id: number;
  title: string;
  author: string;
  coverImage?: string;
  isbn?: string;
  publisher?: string;
  publishDate?: Date;
  description?: string;
  pageCount?: number;
}

/**
 * 리뷰 정보 DTO
 */
export class ReviewInfoDto {
  id: number;
  content: string;
  type: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt?: Date;
  author?: UserInfoDto;
  books?: BookInfoDto[];
}

/**
 * 댓글 정보 DTO
 */
export class CommentInfoDto {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  author?: UserInfoDto;
  reviewId: number;
  review?: ReviewInfoDto;
  parentCommentId?: number;
  parentComment?: CommentInfoDto;
  likeCount: number;
}

/**
 * 서재 정보 DTO
 */
export class LibraryInfoDto {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  ownerId: number;
  owner?: UserInfoDto;
  subscriberCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 알림 응답 DTO
 */
export class NotificationResponseDto {
  id: number;
  type: NotificationType;
  title: string;
  content?: string;
  isRead: boolean;
  action?: string;
  createdAt: Date;
  updatedAt: Date;

  // 사용자 정보
  user?: UserInfoDto;

  // 액션을 취한 사용자 정보
  actor?: UserInfoDto;

  // 관련 리뷰 정보 (전체 정보 포함)
  review?: ReviewInfoDto;

  // 관련 댓글 정보 (전체 정보 포함)
  comment?: CommentInfoDto;

  // 서재 관련 정보 (전체 정보 포함)
  library?: LibraryInfoDto;

  // 관련 책 정보 (전체 정보 포함)
  book?: BookInfoDto;

  // 이미지, 링크 URL
  imageUrl?: string;
  linkUrl?: string;
}

/**
 * 알림 목록 페이지네이션 응답 DTO
 */
export class NotificationPaginationResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  page?: number;
  limit?: number;
}
