import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscoverCategoryDto } from './create-discover-category.dto';

export class UpdateDiscoverCategoryDto extends PartialType(
  CreateDiscoverCategoryDto,
) {}
