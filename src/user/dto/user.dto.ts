import { IsOptional, IsString, Length } from 'class-validator';
import { AuthProvider } from '../entities/user.entity';

export class UpdateUserDto {
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @Length(2, 30, { message: '사용자명은 2-30자 사이여야 합니다.' })
  @IsOptional()
  username?: string;
}

export class UserDetailDto {
  id: number;
  username: string;
  email?: string;
  provider: AuthProvider;
  createdAt: Date;
}

export class LibraryPreviewDto {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  subscriberCount: number;
  bookCount: number;
  previewBooks: BookPreviewDto[];
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
}
