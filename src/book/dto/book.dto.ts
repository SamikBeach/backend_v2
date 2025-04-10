export class BookDto {
  id: number;
  title: string;
  author: string;
  coverImage: string;
  categoryId: number;
  subcategoryId: number;
  rating?: number;
  reviews?: number;
  description?: string;
  publishDate?: Date;
  publisher: string;
  isbn: string;
  isbn13?: string;
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
  description?: string;
  publishDate?: Date;
  publisher: string;
  isbn: string;
  isbn13?: string;
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
  description?: string;
  publishDate?: Date;
  publisher?: string;
  isbn?: string;
  isbn13?: string;
  isFeatured?: boolean;
  isDiscovered?: boolean;
}
