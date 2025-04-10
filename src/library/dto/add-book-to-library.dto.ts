import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class AddBookToLibraryDto {
  @IsNotEmpty()
  @IsNumber()
  bookId: number;

  @IsOptional()
  @IsString()
  note?: string;
}
