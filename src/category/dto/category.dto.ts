export class CategoryDto {
  id: string;
  name: string;
  subcategories?: SubCategoryDto[];
}

export class SubCategoryDto {
  id: string;
  name: string;
  categoryId?: string;
}

export class CreateCategoryDto {
  id: string;
  name: string;
}

export class CreateSubCategoryDto {
  id: string;
  name: string;
  categoryId: string;
}
