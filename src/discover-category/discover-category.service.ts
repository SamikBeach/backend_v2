import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscoverCategory } from './entities/discover-category.entity';
import { DiscoverSubCategory } from './entities/discover-subcategory.entity';
import { CreateDiscoverCategoryDto } from './dto/create-discover-category.dto';
import { UpdateDiscoverCategoryDto } from './dto/update-discover-category.dto';
import {
  CreateDiscoverSubCategoryDto,
  UpdateDiscoverSubCategoryDto,
  DiscoverSubCategoryResponseDto,
} from './dto/discover-subcategory.dto';

// DiscoverCategoryResponseDto 타입 정의
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

@Injectable()
export class DiscoverCategoryService {
  private readonly logger = new Logger(DiscoverCategoryService.name);

  constructor(
    @InjectRepository(DiscoverCategory)
    private readonly discoverCategoryRepository: Repository<DiscoverCategory>,
    @InjectRepository(DiscoverSubCategory)
    private readonly discoverSubCategoryRepository: Repository<DiscoverSubCategory>,
  ) {}

  /**
   * 모든 발견하기 카테고리 조회
   */
  async findAllCategories(): Promise<DiscoverCategory[]> {
    return this.discoverCategoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', id: 'ASC' },
      relations: ['subCategories'],
    });
  }

  /**
   * 특정 발견하기 카테고리 조회
   */
  async findCategoryById(id: number): Promise<DiscoverCategory> {
    const category = await this.discoverCategoryRepository.findOne({
      where: { id, isActive: true },
      relations: ['subCategories'],
    });

    if (!category) {
      throw new NotFoundException(
        `발견하기 카테고리 ID ${id}를 찾을 수 없습니다.`,
      );
    }

    return category;
  }

  /**
   * 발견하기 카테고리 생성
   */
  async createCategory(
    createDiscoverCategoryDto: CreateDiscoverCategoryDto,
  ): Promise<DiscoverCategory> {
    const category = this.discoverCategoryRepository.create(
      createDiscoverCategoryDto,
    );
    return this.discoverCategoryRepository.save(category);
  }

  /**
   * 발견하기 카테고리 업데이트
   */
  async updateCategory(
    id: number,
    updateDiscoverCategoryDto: UpdateDiscoverCategoryDto,
  ): Promise<DiscoverCategory> {
    const category = await this.findCategoryById(id);
    const updatedCategory = { ...category, ...updateDiscoverCategoryDto };
    return this.discoverCategoryRepository.save(updatedCategory);
  }

  /**
   * 발견하기 카테고리 삭제 (실제 삭제 대신 isActive = false로 변경)
   */
  async removeCategory(id: number): Promise<void> {
    const category = await this.findCategoryById(id);
    category.isActive = false;
    await this.discoverCategoryRepository.save(category);
  }

  /**
   * 발견하기 서브카테고리 생성
   */
  async createSubCategory(
    createDiscoverSubCategoryDto: CreateDiscoverSubCategoryDto,
  ): Promise<DiscoverSubCategory> {
    const { discoverCategoryId, ...subCategoryData } =
      createDiscoverSubCategoryDto;

    // 카테고리 확인
    const category = await this.findCategoryById(discoverCategoryId);

    // 서브카테고리 생성
    const subCategory = this.discoverSubCategoryRepository.create({
      ...subCategoryData,
      discoverCategory: category,
      discoverCategoryId, // ID도 명시적으로 설정
    });

    return this.discoverSubCategoryRepository.save(subCategory);
  }

  /**
   * 발견하기 서브카테고리 업데이트
   */
  async updateSubCategory(
    id: number,
    updateDiscoverSubCategoryDto: UpdateDiscoverSubCategoryDto,
  ): Promise<DiscoverSubCategory> {
    const subCategory = await this.findSubCategoryById(id);
    const { discoverCategoryId, ...subCategoryData } =
      updateDiscoverSubCategoryDto;

    // 업데이트할 객체 준비
    const updateData: any = { ...subCategoryData };

    // 카테고리를 변경하는 경우
    if (discoverCategoryId) {
      const category = await this.findCategoryById(discoverCategoryId);
      updateData.discoverCategory = category;
    }

    // 업데이트 수행
    const updatedSubCategory = { ...subCategory, ...updateData };
    return this.discoverSubCategoryRepository.save(updatedSubCategory);
  }

  /**
   * 발견하기 서브카테고리 삭제 (실제 삭제 대신 isActive = false로 변경)
   */
  async removeSubCategory(id: number): Promise<void> {
    const subCategory = await this.findSubCategoryById(id);
    subCategory.isActive = false;
    await this.discoverSubCategoryRepository.save(subCategory);
  }

  /**
   * 특정 발견하기 서브카테고리 조회
   */
  async findSubCategoryById(id: number): Promise<DiscoverSubCategory> {
    const subCategory = await this.discoverSubCategoryRepository.findOne({
      where: { id, isActive: true },
      relations: ['discoverCategory'],
    });

    if (!subCategory) {
      throw new NotFoundException(
        `발견하기 서브카테고리 ID ${id}를 찾을 수 없습니다.`,
      );
    }

    return subCategory;
  }

  /**
   * 카테고리별 서브카테고리 조회
   */
  async findSubCategoriesByCategory(
    categoryId: number,
  ): Promise<DiscoverSubCategory[]> {
    // 카테고리 존재 확인
    await this.findCategoryById(categoryId);

    return this.discoverSubCategoryRepository.find({
      where: {
        discoverCategoryId: categoryId,
        isActive: true,
      },
      relations: ['discoverCategory'],
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * 모든 발견하기 데이터(카테고리와 서브카테고리)를 조회하고 연결된 책도 함께 가져옵니다.
   */
  async findAllDiscoverData(): Promise<DiscoverCategoryResponseDto[]> {
    // 활성화된 모든 카테고리 조회
    const categories = await this.discoverCategoryRepository.find({
      where: { isActive: true },
      relations: ['subCategories', 'books'],
      order: { displayOrder: 'ASC', id: 'ASC' },
    });

    // 응답 형식에 맞게 변환
    return categories.map((category) => {
      const subCategories = category.subCategories
        .filter((subCategory) => subCategory.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((subCategory) => {
          // 해당 서브카테고리에 속한 책 찾기
          const subCategoryBooks = category.books.filter(
            (book) =>
              book.discoverSubCategory &&
              book.discoverSubCategory.id === subCategory.id,
          );

          return {
            id: subCategory.id,
            name: subCategory.name,
            description: subCategory.description,
            displayOrder: subCategory.displayOrder,
            isActive: subCategory.isActive,
            createdAt: subCategory.createdAt,
            updatedAt: subCategory.updatedAt,
            discoverCategoryId: category.id,
            bookCount: subCategoryBooks.length,
          };
        });

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        subCategories,
        bookCount: category.books.length,
      };
    });
  }
}
