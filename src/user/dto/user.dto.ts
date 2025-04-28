import { IsOptional, IsString, Length } from 'class-validator';
import { AuthProvider } from '../entities/user.entity';
import { ReadingStatusType } from '../../reading-status/entities/reading-status.entity';
import { RatingResponseDto } from '../../rating/dto/rating.dto';
import { BookInfoDto } from '../../reading-status/dto/reading-status.dto';
import { ReviewType } from '../../review/entities/review.entity';
import { User } from '../../user/entities/user.entity';

export class UpdateUserDto {
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @Length(2, 30, { message: '사용자명은 2-30자 사이여야 합니다.' })
  @IsOptional()
  username?: string;

  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @Length(0, 200, { message: '자기소개는 최대 200자까지 가능합니다.' })
  @IsOptional()
  bio?: string;

  // 이 필드는 실제로 컨트롤러에서 파일을 받기 위한 마커로만 사용됨
  // 실제 파일은 multer를 통해 처리됨
  @IsOptional()
  profileImage?: any;

  // 프로필 이미지 삭제 요청을 위한 필드
  // FormData에서는 문자열로, JSON에서는 불리언으로 전송될 수 있음
  @IsOptional()
  removeProfileImage?: string | boolean;
}

export class UserDetailDto {
  id: number;
  username: string;
  email?: string;
  bio?: string;
  profileImage?: string;
  provider: AuthProvider;
  createdAt: Date;
}

export class LibraryTagDto {
  id: number;
  tagId: number;
  tagName: string;
  usageCount: number;
  libraryId: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LibraryOwnerDto {
  id: number;
  username: string;
  email: string;
}

export class LibraryPreviewDto {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  subscriberCount: number;
  owner: LibraryOwnerDto;
  tags: LibraryTagDto[];
  bookCount: number;
  previewBooks: BookPreviewDto[];
  isSubscribed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class BookPreviewDto {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  isbn: string;
  publisher: string;
}

export class ImagePreviewDto {
  id: number;
  url: string;
}

export class ReviewPreviewDto {
  id: number;
  content: string;
  type: string;
  previewImage: ImagePreviewDto;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}

export class ReadingCategoryStatDto {
  category: string;
  count: number;
}

export class ReviewCountsDto {
  total: number;
  general: number;
  discussion: number;
  review: number;
  question: number;
  meetup: number;
}

export class UserDetailResponseDto {
  user: UserDetailDto;
  libraryCount: number;
  readCount: number;
  subscribedLibraryCount: number;
  reviewCount: ReviewCountsDto;
  averageRating: number | null;
  ratingCount: number;
  reviewAndRatingCount: number;
  followers: number;
  following: number;
  isEditable: boolean;
  isFollowing?: boolean;
  libraries?: LibraryPreviewDto[];
}

export class FollowerResponseDto {
  id: number;
  username: string;
  bio?: string;
  profileImage?: string;
  isFollowing: boolean;
}

export class FollowersListResponseDto {
  followers: FollowerResponseDto[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export class FollowingListResponseDto {
  following: FollowerResponseDto[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

// 확장된 BookInfoDto, 더 많은 책 정보를 포함
export class ExtendedBookInfoDto {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  isbn: string;
  publisher: string;
  isbn13?: string;
  translator?: string;
  pageCount?: number;
  publishDate?: Date;
  rating?: number;
  reviews?: number;
  totalRatings?: number;
  description?: string;
  tags?: string[];
  categoryId?: number;
  subcategoryId?: number;
  priceSales?: number;
  priceStandard?: number;
  isFeatured?: boolean;
  isDiscovered?: boolean;
}

// ReadingStatusResponseDto와 동일하지만 book 속성이 ExtendedBookInfoDto 타입인 인터페이스
export interface ExtendedReadingStatusResponseDto {
  id: number;
  status: ReadingStatusType;
  currentPage?: number;
  startDate?: Date;
  finishDate?: Date;
  readingMemo?: string;
  createdAt: Date;
  updatedAt: Date;
  book: ExtendedBookInfoDto;
}

export interface RatingWithBookInfoDto extends RatingResponseDto {
  book: BookInfoDto;
}

export type ReviewActivityItem = {
  activityType: string;
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
  }[];
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RatingActivityItem = {
  activityType: string;
  id: number;
  userId: number;
  bookId: number;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  book: BookInfoDto;
  user?: Partial<User>;
};

export type UserActivityItem = ReviewActivityItem | RatingActivityItem;

export function isReviewActivity(
  activity: UserActivityItem,
): activity is ReviewActivityItem {
  return activity.activityType === 'review';
}

export function isRatingActivity(
  activity: UserActivityItem,
): activity is RatingActivityItem {
  return activity.activityType === 'rating';
}
