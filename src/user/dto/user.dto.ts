import { IsOptional, IsString, Length } from 'class-validator';
import { AuthProvider } from '../entities/user.entity';

export class UpdateUserDto {
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @Length(2, 30, { message: '사용자명은 2-30자 사이여야 합니다.' })
  @IsOptional()
  username?: string;

  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @Length(0, 200, { message: '자기소개는 최대 200자까지 가능합니다.' })
  @IsOptional()
  bio?: string;
}

export class UserDetailDto {
  id: number;
  username: string;
  email?: string;
  bio?: string;
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

export class UserDetailResponseDto {
  user: UserDetailDto;
  libraryCount: number;
  readCount: number;
  subscribedLibraryCount: number;
  reviewCount: number;
  followers: number;
  following: number;
  isEditable: boolean;
  isFollowing?: boolean;
  libraries?: LibraryPreviewDto[];
}

export class FollowerResponseDto {
  id: number;
  username: string;
  isFollowing: boolean;
}

export class FollowersListResponseDto {
  followers: FollowerResponseDto[];
  total: number;
}

export class FollowingListResponseDto {
  following: FollowerResponseDto[];
  total: number;
}
