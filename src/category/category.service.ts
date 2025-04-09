import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/subcategory.entity';
import { CreateCategoryDto, CreateSubCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private subcategoryRepository: Repository<SubCategory>,
  ) {}

  /**
   * 모든 카테고리 조회
   */
  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['subcategories'],
    });
  }

  /**
   * ID로 카테고리 조회
   */
  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(`카테고리 ID ${id}를 찾을 수 없습니다.`);
    }

    return category;
  }

  /**
   * 카테고리 생성
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  /**
   * 서브카테고리 생성
   */
  async createSubCategory(
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    // 부모 카테고리 확인
    const category = await this.categoryRepository.findOne({
      where: { id: createSubCategoryDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `카테고리 ID ${createSubCategoryDto.categoryId}를 찾을 수 없습니다.`,
      );
    }

    const subcategory = this.subcategoryRepository.create({
      id: createSubCategoryDto.id,
      name: createSubCategoryDto.name,
      category: category,
    });

    return this.subcategoryRepository.save(subcategory);
  }

  /**
   * 카테고리에 속한 서브카테고리 조회
   */
  async findSubcategoriesByCategoryId(
    categoryId: string,
  ): Promise<SubCategory[]> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException(
        `카테고리 ID ${categoryId}를 찾을 수 없습니다.`,
      );
    }

    return category.subcategories;
  }

  /**
   * ID로 서브카테고리 조회
   */
  async findSubcategoryById(id: string): Promise<SubCategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`서브카테고리 ID ${id}를 찾을 수 없습니다.`);
    }

    return subcategory;
  }
}
