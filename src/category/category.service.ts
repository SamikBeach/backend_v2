import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/subcategory.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private subCategoryRepository: Repository<SubCategory>,
  ) {}

  /**
   * 모든 카테고리 조회
   */
  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      relations: ['subCategories'],
    });
  }

  /**
   * 카테고리 ID로 조회
   */
  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subCategories'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * 카테고리 생성
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  /**
   * 서브카테고리 생성
   */
  async createSubCategory(
    categoryId: number,
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategory> {
    const category = await this.findOne(categoryId);
    const subCategory = this.subCategoryRepository.create({
      ...createSubCategoryDto,
      category,
    });
    return await this.subCategoryRepository.save(subCategory);
  }

  /**
   * 카테고리에 속한 서브카테고리 조회
   */
  async findSubcategoriesByCategoryId(
    categoryId: number,
  ): Promise<SubCategory[]> {
    const category = await this.findOne(categoryId);
    return category.subCategories;
  }

  /**
   * 서브카테고리 ID로 조회
   */
  async findSubcategoryById(id: number): Promise<SubCategory> {
    const subcategory = await this.subCategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`서브카테고리 ID ${id}를 찾을 수 없습니다.`);
    }

    return subcategory;
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }
}
