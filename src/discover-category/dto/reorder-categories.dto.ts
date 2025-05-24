import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryOrderDto {
  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class SubCategoryOrderDto {
  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderDto)
  categories: CategoryOrderDto[];
}

export class ReorderSubCategoriesDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubCategoryOrderDto)
  subCategories: SubCategoryOrderDto[];
}
