import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateDiscoverSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsInt()
  @Min(1)
  discoverCategoryId: number;
}

export class UpdateDiscoverSubCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  discoverCategoryId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DiscoverSubCategoryResponseDto {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  discoverCategoryId: number;
  bookCount?: number;
}
