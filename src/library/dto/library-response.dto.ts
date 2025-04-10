import { Book } from '../../book/entities/book.entity';
import { User } from '../../user/entities/user.entity';

export class LibraryBookResponseDto {
  id: number;
  bookId: number;
  libraryId: number;
  note?: string;
  book: Partial<Book>;
  createdAt: Date;
}

export class LibraryTagResponseDto {
  id: number;
  name: string;
  libraryId: number;
  createdAt: Date;
}

export class LibraryOwnerDto {
  id: number;
  username: string;
  email: string;
}

export class LibraryResponseDto {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  subscriberCount: number;
  owner: LibraryOwnerDto;
  books?: LibraryBookResponseDto[];
  tags?: LibraryTagResponseDto[];
  isSubscribed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class LibraryListResponseDto {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  subscriberCount: number;
  bookCount: number;
  owner: LibraryOwnerDto;
  tags?: LibraryTagResponseDto[];
  isSubscribed?: boolean;
  createdAt: Date;
}

export class SubscriberResponseDto {
  id: number;
  username: string;
  email: string;
}
