import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { AladinService } from '../common/services/aladin.service';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../category/subcategory.service';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly aladinService: AladinService,
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: SubCategoryService,
    private readonly discoverCategoryService: DiscoverCategoryService,
  ) {}

  /**
   * 모든 도서 조회
   */
  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['category', 'subcategory'],
    });
  }

  /**
   * ID로 도서 조회
   */
  async findById(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['category', 'subcategory'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return book;
  }

  /**
   * 카테고리에 속한 도서 조회
   */
  async findByCategoryId(categoryId: number): Promise<Book[]> {
    const category = await this.categoryService.findOne(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.bookRepository.find({
      where: { category: { id: category.id } },
      relations: ['category', 'subcategory'],
    });
  }

  /**
   * 서브카테고리에 속한 도서 조회
   */
  async findBySubcategoryId(subcategoryId: number): Promise<Book[]> {
    const subcategory = await this.subCategoryService.findOne(subcategoryId);
    if (!subcategory) {
      throw new NotFoundException(
        `Subcategory with ID ${subcategoryId} not found`,
      );
    }

    return this.bookRepository.find({
      where: { subcategory: { id: subcategory.id } },
      relations: ['category', 'subcategory'],
    });
  }

  /**
   * 모든 카테고리의 인기 도서 조회
   */
  async findFeaturedBooks(): Promise<Book[]> {
    return this.bookRepository.find({
      where: { isFeatured: true },
      relations: ['category', 'subcategory'],
    });
  }

  /**
   * 새 도서 생성
   */
  async create(createBookDto: CreateBookDto): Promise<Book> {
    const { categoryId, subcategoryId, ...bookData } = createBookDto;

    const category = await this.categoryService.findOne(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    let subcategory = null;
    if (subcategoryId) {
      subcategory = await this.subCategoryService.findOne(subcategoryId);
      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory with ID ${subcategoryId} not found`,
        );
      }
    }

    const book = this.bookRepository.create({
      ...bookData,
      category,
      subcategory,
    });

    return this.bookRepository.save(book);
  }

  /**
   * 도서 업데이트
   */
  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findById(id);
    const { categoryId, subcategoryId, ...bookData } = updateBookDto;

    if (categoryId) {
      const category = await this.categoryService.findOne(categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
      book.category = category;
    }

    if (subcategoryId) {
      const subcategory = await this.subCategoryService.findOne(subcategoryId);
      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory with ID ${subcategoryId} not found`,
        );
      }
      book.subcategory = subcategory;
    }

    Object.assign(book, bookData);
    return this.bookRepository.save(book);
  }

  /**
   * ISBN으로 도서 검색
   */
  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: { isbn },
      relations: ['category', 'subcategory'],
    });
  }

  /**
   * 알라딘 API로 도서 정보 가져오기
   */
  async fetchBookDetailsFromAladin(isbn: string): Promise<Book> {
    try {
      const bookData = await this.aladinService.getBookDetail({ itemId: isbn });
      const category = await this.categoryService.findOne(
        Number(bookData.categoryId),
      );

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${bookData.categoryId} not found`,
        );
      }

      const book = this.bookRepository.create({
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.cover || null,
        isbn: bookData.isbn,
        isbn13: bookData.isbn13,
        publisher: bookData.publisher,
        publishDate: new Date(bookData.pubDate),
        rating: parseFloat(bookData.customerReviewRank) || 0,
        reviews: parseInt(bookData.customerReviewCount) || 0,
        description: bookData.description,
        category,
      });

      return this.bookRepository.save(book);
    } catch {
      throw new NotFoundException(
        `Failed to fetch book details for ISBN ${isbn}`,
      );
    }
  }

  /**
   * 카테고리별 인기 도서 초기화 (알라딘 API 사용)
   */
  async initializeFeaturedBooksByCategory(
    categoryId: number,
    count: number = 10,
  ): Promise<Book[]> {
    const category = await this.categoryService.findOne(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // 해당 카테고리의 모든 도서를 가져옴
    const books = await this.bookRepository.find({
      where: { category: { id: category.id } },
      relations: ['category', 'subcategory'],
      order: { rating: 'DESC' },
      take: count,
    });

    // 상위 N개의 도서를 featured로 설정
    for (const book of books) {
      book.isFeatured = true;
      await this.bookRepository.save(book);
    }

    return books;
  }

  async remove(id: number): Promise<void> {
    const result = await this.bookRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
  }

  /**
   * 특정 카테고리의 인기 도서 조회
   * @param categoryId 카테고리 ID
   * @param subcategoryId 서브카테고리 ID (선택)
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc)
   * @param timeRange 기간 필터 (all, month, year)
   */
  async findPopularBooksByCategory(
    categoryId: number,
    subcategoryId?: number,
    sort: string = 'rating-desc',
    timeRange: string = 'all',
  ): Promise<Book[]> {
    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory');

    // 카테고리 필터링
    queryBuilder.where('category.id = :categoryId', { categoryId });

    // 서브카테고리 필터링 (있는 경우)
    if (subcategoryId) {
      queryBuilder.andWhere('subcategory.id = :subcategoryId', {
        subcategoryId,
      });
    }

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'month') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
      } else if (timeRange === 'year') {
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
      }

      if (startDate) {
        queryBuilder.andWhere('book.publishDate >= :startDate', { startDate });
      }
    }

    // 정렬 적용
    switch (sort) {
      case 'rating-desc':
        queryBuilder.orderBy('book.rating', 'DESC');
        break;
      case 'reviews-desc':
        queryBuilder.orderBy('book.reviews', 'DESC');
        break;
      case 'publishDate-desc':
        queryBuilder.orderBy('book.publishDate', 'DESC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * 모든 카테고리의 인기 도서 조회
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc)
   * @param timeRange 기간 필터 (all, month, year)
   */
  async findAllPopularBooks(
    sort: string = 'rating-desc',
    timeRange: string = 'all',
  ): Promise<Book[]> {
    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory');

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'month') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
      } else if (timeRange === 'year') {
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
      }

      if (startDate) {
        queryBuilder.andWhere('book.publishDate >= :startDate', { startDate });
      }
    }

    // 정렬 적용
    switch (sort) {
      case 'rating-desc':
        queryBuilder.orderBy('book.rating', 'DESC');
        break;
      case 'reviews-desc':
        queryBuilder.orderBy('book.reviews', 'DESC');
        break;
      case 'publishDate-desc':
        queryBuilder.orderBy('book.publishDate', 'DESC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * 특정 DiscoverCategory에 속한 도서 조회
   */
  async findByDiscoverCategoryId(discoverCategoryId: number): Promise<Book[]> {
    const discoverCategory =
      await this.discoverCategoryService.findCategoryById(discoverCategoryId);
    if (!discoverCategory) {
      throw new NotFoundException(
        `DiscoverCategory with ID ${discoverCategoryId} not found`,
      );
    }

    return this.bookRepository.find({
      where: { discoverCategoryId: discoverCategory.id },
      relations: [
        'category',
        'subcategory',
        'discoverCategory',
        'discoverSubCategory',
      ],
    });
  }

  /**
   * 특정 DiscoverSubCategory에 속한 도서 조회
   */
  async findByDiscoverSubCategoryId(
    discoverSubCategoryId: number,
  ): Promise<Book[]> {
    const discoverSubCategory =
      await this.discoverCategoryService.findSubCategoryById(
        discoverSubCategoryId,
      );
    if (!discoverSubCategory) {
      throw new NotFoundException(
        `DiscoverSubCategory with ID ${discoverSubCategoryId} not found`,
      );
    }

    return this.bookRepository.find({
      where: { discoverSubCategoryId: discoverSubCategory.id },
      relations: [
        'category',
        'subcategory',
        'discoverCategory',
        'discoverSubCategory',
      ],
    });
  }

  /**
   * 도서를 DiscoverCategory에 추가
   */
  async addBookToDiscoverCategory(
    bookId: number,
    discoverCategoryId: number,
    discoverSubCategoryId?: number,
  ): Promise<Book> {
    const book = await this.findById(bookId);
    const discoverCategory =
      await this.discoverCategoryService.findCategoryById(discoverCategoryId);

    let discoverSubCategory = null;
    if (discoverSubCategoryId) {
      discoverSubCategory =
        await this.discoverCategoryService.findSubCategoryById(
          discoverSubCategoryId,
        );

      // 서브카테고리가 해당 카테고리에 속하는지 확인
      if (discoverSubCategory.discoverCategoryId !== discoverCategory.id) {
        throw new NotFoundException(
          `DiscoverSubCategory with ID ${discoverSubCategoryId} does not belong to DiscoverCategory with ID ${discoverCategoryId}`,
        );
      }
    }

    // 도서 업데이트
    book.discoverCategory = discoverCategory;
    book.discoverCategoryId = discoverCategory.id;
    book.isDiscovered = true;

    if (discoverSubCategory) {
      book.discoverSubCategory = discoverSubCategory;
      book.discoverSubCategoryId = discoverSubCategory.id;
    }

    return this.bookRepository.save(book);
  }

  /**
   * 도서를 DiscoverCategory에서 제거
   */
  async removeBookFromDiscoverCategory(bookId: number): Promise<Book> {
    const book = await this.findById(bookId);

    // 도서가 Discover에 속하지 않으면 오류
    if (!book.discoverCategoryId) {
      throw new NotFoundException(
        `Book with ID ${bookId} is not in any DiscoverCategory`,
      );
    }

    // 도서 업데이트
    book.discoverCategory = null;
    book.discoverCategoryId = null;
    book.discoverSubCategory = null;
    book.discoverSubCategoryId = null;
    book.isDiscovered = false;

    return this.bookRepository.save(book);
  }

  /**
   * 모든 Discover 도서 조회
   */
  async findAllDiscoverBooks(): Promise<Book[]> {
    return this.bookRepository.find({
      where: { isDiscovered: true },
      relations: [
        'category',
        'subcategory',
        'discoverCategory',
        'discoverSubCategory',
      ],
    });
  }
}
