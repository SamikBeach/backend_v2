import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AddBookToLibraryDto } from './add-book-to-library.dto';

export class AddBooksToLibraryDto {
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1권 이상의 책을 추가해야 합니다' })
  @ValidateNested({ each: true })
  @Type(() => AddBookToLibraryDto)
  books: AddBookToLibraryDto[];
}
