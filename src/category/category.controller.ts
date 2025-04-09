import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/subcategory.entity';
import { CreateCategoryDto, CreateSubCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @Get(':id/subcategories')
  async findSubcategoriesByCategoryId(
    @Param('id') categoryId: string,
  ): Promise<SubCategory[]> {
    return this.categoryService.findSubcategoriesByCategoryId(categoryId);
  }

  @Post('subcategories')
  @UseGuards(JwtAuthGuard)
  async createSubCategory(
    @Body() createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    return this.categoryService.createSubCategory(createSubCategoryDto);
  }

  @Get('subcategories/:id')
  async findSubcategoryById(@Param('id') id: string): Promise<SubCategory> {
    return this.categoryService.findSubcategoryById(id);
  }
}
