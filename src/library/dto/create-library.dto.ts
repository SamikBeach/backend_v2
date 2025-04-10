import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

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
}
