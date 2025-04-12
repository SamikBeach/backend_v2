export interface OwnerInfoDto {
  id: number;
  username: string;
  email: string;
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
  libraryId: number;
  note?: string;
  createdAt: Date;
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
  date: Date;
  message: string;
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
