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
import { DiscoverCategoryService } from './discover-category.service';
import { CreateDiscoverCategoryDto } from './dto/create-discover-category.dto';
import { UpdateDiscoverCategoryDto } from './dto/update-discover-category.dto';
import {
  CreateDiscoverSubCategoryDto,
  UpdateDiscoverSubCategoryDto,
  DiscoverSubCategoryResponseDto,
} from './dto/discover-subcategory.dto';
import { DiscoverCategory } from './entities/discover-category.entity';
import { DiscoverSubCategory } from './entities/discover-subcategory.entity';
import { IsPublic } from '../auth/decorators/is-public.decorator';

// DiscoverCategoryResponseDto 인터페이스 정의 추가
interface DiscoverCategoryResponseDto {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subCategories: DiscoverSubCategoryResponseDto[];
  bookCount: number;
}

@Controller('discover-categories')
export class DiscoverCategoryController {
  constructor(
    private readonly discoverCategoryService: DiscoverCategoryService,
  ) {}

  // ======= 카테고리 관련 엔드포인트 =======

  @IsPublic()
  @Get()
  async findAllCategories(): Promise<DiscoverCategory[]> {
    return this.discoverCategoryService.findAllCategories();
  }

  @IsPublic()
  @Get(':id')
  async findCategoryById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DiscoverCategory> {
    return this.discoverCategoryService.findCategoryById(id);
  }

  @Post()
  async createCategory(
    @Body() createDiscoverCategoryDto: CreateDiscoverCategoryDto,
  ): Promise<DiscoverCategory> {
    return this.discoverCategoryService.createCategory(
      createDiscoverCategoryDto,
    );
  }

  @Patch(':id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDiscoverCategoryDto: UpdateDiscoverCategoryDto,
  ): Promise<DiscoverCategory> {
    return this.discoverCategoryService.updateCategory(
      id,
      updateDiscoverCategoryDto,
    );
  }

  @Delete(':id')
  async removeCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.discoverCategoryService.removeCategory(id);
  }

  // ======= 서브카테고리 관련 엔드포인트 =======

  @IsPublic()
  @Get(':id/subcategories')
  async findSubCategoriesByCategory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DiscoverSubCategory[]> {
    return this.discoverCategoryService.findSubCategoriesByCategory(id);
  }

  @Post('subcategories')
  async createSubCategory(
    @Body() createDiscoverSubCategoryDto: CreateDiscoverSubCategoryDto,
  ): Promise<DiscoverSubCategory> {
    return this.discoverCategoryService.createSubCategory(
      createDiscoverSubCategoryDto,
    );
  }

  @IsPublic()
  @Get('subcategories/:id')
  async findSubCategoryById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DiscoverSubCategory> {
    return this.discoverCategoryService.findSubCategoryById(id);
  }

  @Patch('subcategories/:id')
  async updateSubCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDiscoverSubCategoryDto: UpdateDiscoverSubCategoryDto,
  ): Promise<DiscoverSubCategory> {
    return this.discoverCategoryService.updateSubCategory(
      id,
      updateDiscoverSubCategoryDto,
    );
  }

  @Delete('subcategories/:id')
  async removeSubCategory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.discoverCategoryService.removeSubCategory(id);
  }

  // ======= 통합 데이터 조회 API =======

  @IsPublic()
  @Get('all/data')
  async findAllDiscoverData(): Promise<DiscoverCategoryResponseDto[]> {
    return this.discoverCategoryService.findAllDiscoverData();
  }
}
