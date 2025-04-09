import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Post('subcategory')
  createSubCategory(
    @Body('categoryId', ParseIntPipe) categoryId: number,
    @Body() createSubCategoryDto: CreateSubCategoryDto,
  ) {
    return this.categoryService.createSubCategory(
      categoryId,
      createSubCategoryDto,
    );
  }

  @Get()
  @IsPublic()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @IsPublic()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Get(':id/subcategories')
  @IsPublic()
  findSubcategories(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findSubcategoriesByCategoryId(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
