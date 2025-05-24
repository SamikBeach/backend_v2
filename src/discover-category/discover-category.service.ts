import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { DiscoverCategory } from './entities/discover-category.entity';
import { DiscoverSubCategory } from './entities/discover-subcategory.entity';
import { CreateDiscoverCategoryDto } from './dto/create-discover-category.dto';
import { UpdateDiscoverCategoryDto } from './dto/update-discover-category.dto';
import {
  CreateDiscoverSubCategoryDto,
  UpdateDiscoverSubCategoryDto,
  DiscoverSubCategoryResponseDto,
} from './dto/discover-subcategory.dto';
import {
  ReorderCategoriesDto,
  ReorderSubCategoriesDto,
} from './dto/reorder-categories.dto';

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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 모든 발견하기 카테고리 조회 (활성/비활성 모두 포함)
   */
  async findAllCategories(): Promise<DiscoverCategory[]> {
    return this.discoverCategoryRepository.find({
      order: { displayOrder: 'ASC', id: 'ASC' },
      relations: ['subCategories'],
    });
  }

  /**
   * 특정 발견하기 카테고리 조회 (활성/비활성 모두 포함)
   */
  async findCategoryById(id: number): Promise<DiscoverCategory> {
    const category = await this.discoverCategoryRepository.findOne({
      where: { id },
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
   * 발견하기 카테고리 삭제 (실제 삭제)
   */
  async removeCategory(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 카테고리 존재 확인
      const category = await queryRunner.manager.findOne(DiscoverCategory, {
        where: { id },
        relations: ['subCategories', 'books'],
      });

      if (!category) {
        throw new NotFoundException(
          `발견하기 카테고리 ID ${id}를 찾을 수 없습니다.`,
        );
      }

      // 연결된 서브카테고리가 있는 경우 먼저 삭제
      if (category.subCategories && category.subCategories.length > 0) {
        for (const subCategory of category.subCategories) {
          // 각 서브카테고리에 연결된 책이 있는지 확인하고 연결 해제
          const subCategoryBooks = await queryRunner.manager.count('book', {
            where: { discoverSubCategoryId: subCategory.id },
          });

          if (subCategoryBooks > 0) {
            // 서브카테고리에 연결된 책들의 discoverSubCategoryId를 null로 설정
            await queryRunner.manager.update(
              'book',
              { discoverSubCategoryId: subCategory.id },
              { discoverSubCategoryId: null },
            );
          }

          await queryRunner.manager.remove(DiscoverSubCategory, subCategory);
        }
      }

      // 연결된 책이 있는 경우 카테고리 연결 해제
      if (category.books && category.books.length > 0) {
        // 카테고리에 연결된 책들의 discoverCategoryId를 null로 설정
        await queryRunner.manager.update(
          'book',
          { discoverCategoryId: id },
          { discoverCategoryId: null },
        );
      }

      // 카테고리 삭제
      await queryRunner.manager.remove(DiscoverCategory, category);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
   * 발견하기 서브카테고리 삭제 (실제 삭제)
   */
  async removeSubCategory(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 서브카테고리 존재 확인
      const subCategory = await queryRunner.manager.findOne(
        DiscoverSubCategory,
        {
          where: { id },
          relations: ['books'],
        },
      );

      if (!subCategory) {
        throw new NotFoundException(
          `발견하기 서브카테고리 ID ${id}를 찾을 수 없습니다.`,
        );
      }

      // 연결된 책이 있는 경우 연결 해제
      if (subCategory.books && subCategory.books.length > 0) {
        // 서브카테고리에 연결된 책들의 discoverSubCategoryId를 null로 설정
        await queryRunner.manager.update(
          'book',
          { discoverSubCategoryId: id },
          { discoverSubCategoryId: null },
        );
      }

      // 서브카테고리 삭제
      await queryRunner.manager.remove(DiscoverSubCategory, subCategory);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 특정 발견하기 서브카테고리 조회 (활성/비활성 모두 포함)
   */
  async findSubCategoryById(id: number): Promise<DiscoverSubCategory> {
    const subCategory = await this.discoverSubCategoryRepository.findOne({
      where: { id },
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
   * 카테고리별 서브카테고리 조회 (활성/비활성 모두 포함)
   */
  async findSubCategoriesByCategory(
    categoryId: number,
  ): Promise<DiscoverSubCategory[]> {
    // 카테고리 존재 확인
    await this.findCategoryById(categoryId);

    return this.discoverSubCategoryRepository.find({
      where: {
        discoverCategoryId: categoryId,
      },
      relations: ['discoverCategory'],
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  /**
   * 모든 발견하기 데이터(카테고리와 서브카테고리)를 조회하고 연결된 책도 함께 가져옵니다. (활성/비활성 모두 포함)
   */
  async findAllDiscoverData(): Promise<DiscoverCategoryResponseDto[]> {
    // 모든 카테고리 조회 (활성/비활성 모두)
    const categories = await this.discoverCategoryRepository.find({
      relations: ['subCategories', 'books'],
      order: { displayOrder: 'ASC', id: 'ASC' },
    });

    // 응답 형식에 맞게 변환
    return categories.map((category) => {
      const subCategories = category.subCategories
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

  /**
   * 카테고리 순서 변경 (배치 업데이트로 성능 개선)
   */
  async reorderCategories(
    reorderCategoriesDto: ReorderCategoriesDto,
  ): Promise<void> {
    const { categories } = reorderCategoriesDto;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 모든 카테고리 ID 검증
      const categoryIds = categories.map((c) => c.id);
      const existingCategories = await queryRunner.manager.find(
        DiscoverCategory,
        {
          where: { id: In(categoryIds) },
          select: ['id'],
        },
      );

      if (existingCategories.length !== categoryIds.length) {
        const foundIds = existingCategories.map((c) => c.id);
        const missingIds = categoryIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `다음 카테고리 ID들을 찾을 수 없습니다: ${missingIds.join(', ')}`,
        );
      }

      // 배치 업데이트 실행
      for (const categoryOrder of categories) {
        await queryRunner.manager.update(
          DiscoverCategory,
          { id: categoryOrder.id },
          { displayOrder: categoryOrder.displayOrder },
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`카테고리 순서 변경 완료: ${categories.length}개 항목`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`카테고리 순서 변경 실패: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 서브카테고리 순서 변경 (배치 업데이트로 성능 개선)
   */
  async reorderSubCategories(
    reorderSubCategoriesDto: ReorderSubCategoriesDto,
  ): Promise<void> {
    const { categoryId, subCategories } = reorderSubCategoriesDto;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 카테고리 존재 확인
      const category = await queryRunner.manager.findOne(DiscoverCategory, {
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `카테고리 ID ${categoryId}를 찾을 수 없습니다.`,
        );
      }

      // 모든 서브카테고리 ID 검증 및 카테고리 소속 확인
      const subCategoryIds = subCategories.map((sc) => sc.id);
      const existingSubCategories = await queryRunner.manager.find(
        DiscoverSubCategory,
        {
          where: {
            id: In(subCategoryIds),
            discoverCategoryId: categoryId,
          },
          select: ['id', 'discoverCategoryId'],
        },
      );

      if (existingSubCategories.length !== subCategoryIds.length) {
        const foundIds = existingSubCategories.map((sc) => sc.id);
        const missingIds = subCategoryIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new NotFoundException(
          `다음 서브카테고리 ID들을 카테고리 ${categoryId}에서 찾을 수 없습니다: ${missingIds.join(', ')}`,
        );
      }

      // 배치 업데이트 실행
      for (const subCategoryOrder of subCategories) {
        await queryRunner.manager.update(
          DiscoverSubCategory,
          { id: subCategoryOrder.id, discoverCategoryId: categoryId },
          { displayOrder: subCategoryOrder.displayOrder },
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `서브카테고리 순서 변경 완료: 카테고리 ${categoryId}, ${subCategories.length}개 항목`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`서브카테고리 순서 변경 실패: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
