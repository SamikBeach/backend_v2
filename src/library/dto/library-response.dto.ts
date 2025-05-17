export interface OwnerInfoDto {
  id: number;
  username: string;
  email: string;
  profileImage?: string;
  isFollowing?: boolean;
}

export interface BookInfoDto {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  isbn: string;
  publisher: string;
}

export interface LibraryTagResponseDto {
  id: number;
  tagId: number;
  tagName: string;
  description?: string;
  usageCount: number;
  libraryId: number;
  note?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface LibraryBookResponseDto {
  id: number;
  bookId: number;
  libraryId: number;
  note?: string;
  book: BookInfoDto;
  createdAt: Date;
}

export interface SubscriberResponseDto {
  id: number;
  username: string;
  email: string;
  profileImage?: string;
}

export interface UpdateHistoryItem {
  id: number;
  date: Date;
  message: string;
  activityType: string;
  userId?: number;
  userName?: string;
  bookId?: number;
  tagId?: number;
  bookTitle?: string;
}

export interface LibraryResponseDto {
  id: number;
  name: string;
  description: string;
  isPublic: boolean;
  subscriberCount: number;
  owner: OwnerInfoDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryListResponseDto extends LibraryResponseDto {
  bookCount: number;
  previewBooks: BookInfoDto[];
  tags: LibraryTagResponseDto[];
  isSubscribed: boolean;
}

export interface LibraryDetailResponseDto
  extends Omit<LibraryResponseDto, 'subscriberCount'> {
  books: LibraryBookResponseDto[];
  tags: LibraryTagResponseDto[];
  isSubscribed: boolean;
  subscriberCount: number;
  subscribers: SubscriberResponseDto[];
  recentUpdates: UpdateHistoryItem[];
}

// 기간 필터 옵션
export enum TimeRangeOptions {
  ALL = 'all',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

// 페이지네이션 메타데이터
export interface LibraryResponseMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sort?: LibrarySortOption;
  timeRange?: TimeRangeOptions;
  query?: string;
  tagId?: number;
  tagName?: string;
}

// 페이지네이션 응답 형식
export interface PaginatedLibraryResponse {
  data: LibraryListResponseDto[];
  meta: LibraryResponseMeta;
}

export interface PopularLibraryResponseDto {
  id: number;
  name: string;
  ownerName: string;
  ownerProfileImage?: string;
  subscriberCount: number;
  bookCount: number;
  previewBooks: BookInfoDto[];
}

export enum LibrarySortOption {
  SUBSCRIBERS = 'subscribers', // 구독자 많은 순
  BOOKS = 'books', // 담긴 책 많은 순
  RECENT = 'recent', // 최신순
}
