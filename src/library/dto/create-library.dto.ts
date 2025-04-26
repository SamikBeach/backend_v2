import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLibraryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  tagIds?: number[];
}
