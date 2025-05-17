import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AddTagToLibraryDto {
  @IsOptional()
  @IsNumber()
  tagId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
