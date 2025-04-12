import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import {
  AladinService,
  AladinBookSearchParams,
  AladinQueryType,
  AladinSort,
  AladinSearchTarget,
  AladinCover,
} from '../common/services/aladin.service';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../category/subcategory.service';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';
import { SearchBookDto } from './dto/search-book.dto';
import { SearchService } from '../search/search.service';

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
    private readonly searchService: SearchService,
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
   * ID 배열로 여러 도서 조회
   */
  async findByIds(ids: number[]): Promise<Book[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.bookRepository.find({
      where: { id: In(ids) },
      relations: ['category', 'subcategory'],
    });
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
      const result = await this.aladinService.getBookDetail({ itemId: isbn });
      if (!result || !result.item || result.item.length === 0) {
        throw new NotFoundException(
          `Failed to fetch book details for ISBN ${isbn}`,
        );
      }

      // 첫 번째 아이템 선택
      const bookItem = result.item[0];

      // 기본 카테고리 사용 (추후 매핑 로직 추가 가능)
      const category = await this.categoryService.findOne(1);
      if (!category) {
        throw new NotFoundException(`Category with ID 1 not found`);
      }

      // 책 데이터 추출
      const bookData = this.aladinService.extractBookData(bookItem);

      // 새 Book 엔티티 생성
      const newBook = this.bookRepository.create({
        ...bookData,
        category,
      }) as unknown as Book;

      // 단일 엔티티 저장 시 첫 번째 결과값 반환
      const savedBook = await (this.bookRepository.save(
        newBook,
      ) as unknown as Promise<Book>);
      return savedBook;
    } catch (error) {
      this.logger.error(
        `Failed to fetch book details for ISBN ${isbn}: ${error.message}`,
      );
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
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc, publishDate-asc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
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

      if (timeRange === 'today') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (timeRange === 'week') {
        // 이번 주의 시작일(월요일)을 계산
        const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
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
      case 'publishDate-asc':
        queryBuilder.orderBy('book.publishDate', 'ASC');
        break;
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * 모든 카테고리의 인기 도서 조회
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc, publishDate-asc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
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

      if (timeRange === 'today') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (timeRange === 'week') {
        // 이번 주의 시작일(월요일)을 계산
        const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
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
      case 'publishDate-asc':
        queryBuilder.orderBy('book.publishDate', 'ASC');
        break;
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * 특정 DiscoverCategory에 속한 도서 조회
   * @param discoverCategoryId 발견하기 카테고리 ID
   * @param discoverSubCategoryId 발견하기 서브카테고리 ID (선택)
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc, publishDate-asc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
   */
  async findByDiscoverCategoryId(
    discoverCategoryId: number,
    discoverSubCategoryId?: number,
    sort: string = 'rating-desc',
    timeRange: string = 'all',
  ): Promise<Book[]> {
    const discoverCategory =
      await this.discoverCategoryService.findCategoryById(discoverCategoryId);
    if (!discoverCategory) {
      throw new NotFoundException(
        `DiscoverCategory with ID ${discoverCategoryId} not found`,
      );
    }

    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .leftJoinAndSelect('book.discoverCategory', 'discoverCategory')
      .leftJoinAndSelect('book.discoverSubCategory', 'discoverSubCategory')
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
      .andWhere('discoverCategory.id = :discoverCategoryId', {
        discoverCategoryId,
      });

    // 서브카테고리 필터링 (있는 경우)
    if (discoverSubCategoryId) {
      queryBuilder.andWhere('discoverSubCategory.id = :discoverSubCategoryId', {
        discoverSubCategoryId,
      });
    }

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'today') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (timeRange === 'week') {
        // 이번 주의 시작일(월요일)을 계산
        const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
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
      case 'publishDate-asc':
        queryBuilder.orderBy('book.publishDate', 'ASC');
        break;
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * 특정 DiscoverSubCategory에 속한 도서 조회
   * @param discoverSubCategoryId 발견하기 서브카테고리 ID
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc, publishDate-asc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
   */
  async findByDiscoverSubCategoryId(
    discoverSubCategoryId: number,
    sort: string = 'rating-desc',
    timeRange: string = 'all',
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

    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .leftJoinAndSelect('book.discoverCategory', 'discoverCategory')
      .leftJoinAndSelect('book.discoverSubCategory', 'discoverSubCategory')
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
      .andWhere('discoverSubCategory.id = :discoverSubCategoryId', {
        discoverSubCategoryId,
      });

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'today') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (timeRange === 'week') {
        // 이번 주의 시작일(월요일)을 계산
        const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
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
      case 'publishDate-asc':
        queryBuilder.orderBy('book.publishDate', 'ASC');
        break;
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
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
      if (discoverSubCategory.discoverCategory.id !== discoverCategory.id) {
        throw new NotFoundException(
          `DiscoverSubCategory with ID ${discoverSubCategoryId} does not belong to DiscoverCategory with ID ${discoverCategoryId}`,
        );
      }
    }

    // 도서 업데이트
    book.discoverCategory = discoverCategory;
    book.isDiscovered = true;

    if (discoverSubCategory) {
      book.discoverSubCategory = discoverSubCategory;
    }

    return this.bookRepository.save(book);
  }

  /**
   * 도서를 DiscoverCategory에서 제거
   */
  async removeBookFromDiscoverCategory(bookId: number): Promise<Book> {
    const book = await this.findById(bookId);

    // 도서가 Discover에 속하지 않으면 오류
    if (!book.discoverCategory) {
      throw new NotFoundException(
        `Book with ID ${bookId} is not in any DiscoverCategory`,
      );
    }

    // 도서 업데이트
    book.discoverCategory = null;
    book.discoverSubCategory = null;
    book.isDiscovered = false;

    return this.bookRepository.save(book);
  }

  /**
   * 모든 Discover 도서 조회
   * @param sort 정렬 방식 (rating-desc, reviews-desc, publishDate-desc, publishDate-asc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
   */
  async findAllDiscoverBooks(
    sort: string = 'rating-desc',
    timeRange: string = 'all',
  ): Promise<Book[]> {
    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .leftJoinAndSelect('book.discoverCategory', 'discoverCategory')
      .leftJoinAndSelect('book.discoverSubCategory', 'discoverSubCategory')
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true });

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'today') {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (timeRange === 'week') {
        // 이번 주의 시작일(월요일)을 계산
        const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
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
      case 'publishDate-asc':
        queryBuilder.orderBy('book.publishDate', 'ASC');
        break;
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 결과 반환
    return queryBuilder.getMany();
  }

  /**
   * isDiscovered 도서 설정 - 검색/조회를 위한 메서드
   */
  async setBookAsDiscovered(
    id: number,
    isDiscovered: boolean = true,
  ): Promise<Book> {
    const book = await this.findById(id);
    book.isDiscovered = isDiscovered;
    return this.bookRepository.save(book);
  }

  /**
   * 홈 화면용 인기 도서 조회 (제한된 수량, 카테고리별로 분류)
   * @param limit 카테고리별 최대 도서 수
   */
  async findPopularBooksForHome(limit: number = 4): Promise<any> {
    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .where('book.isFeatured = :isFeatured', { isFeatured: true })
      .orderBy('book.rating', 'DESC')
      .addOrderBy('book.reviews', 'DESC')
      .take(limit * 2); // 충분한 수의 책을 가져와서 카테고리별로 필터링

    const books = await queryBuilder.getMany();

    // 홈화면에 표시할 책 정보를 포함 (ISBN 등 추가)
    const simplifiedBooks = books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverImage: book.coverImage,
      isbn: book.isbn,
      isbn13: book.isbn13,
      publisher: book.publisher,
      publishDate: book.publishDate,
      rating: book.rating,
      reviews: book.reviews,
      description: book.description?.substring(0, 100) + '...', // 간략한 설명만 포함
      priceSales: book.priceSales,
      priceStandard: book.priceStandard,
      category: {
        id: book.category?.id,
        name: book.category?.name,
      },
      subcategory: book.subcategory
        ? {
            id: book.subcategory.id,
            name: book.subcategory.name,
          }
        : null,
    }));

    return simplifiedBooks;
  }

  /**
   * 홈 화면용 오늘의 발견 도서 조회
   * @param limit 가져올 도서 수
   */
  async findDiscoverBooksForHome(limit: number = 6): Promise<any> {
    // discoverCategory에서 활성화된 카테고리 가져오기
    const categories = await this.discoverCategoryService.findAllCategories();

    if (!categories.length) {
      return [];
    }

    // 활성화된 상위 2개 카테고리만 사용
    const activeCategories = categories.slice(0, 2);

    // 각 카테고리에 속한 도서 가져오기
    const result = await Promise.all(
      activeCategories.map(async (category) => {
        // 해당 카테고리에 속한 도서 가져오기
        const books = await this.bookRepository
          .createQueryBuilder('book')
          .leftJoinAndSelect('book.category', 'bookCategory')
          .leftJoinAndSelect('book.discoverCategory', 'discoverCategory')
          .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
          .andWhere('discoverCategory.id = :categoryId', {
            categoryId: category.id,
          })
          .orderBy('book.rating', 'DESC')
          .take(limit / activeCategories.length)
          .getMany();

        // 도서 정보 가공
        const discoveryBooks = books.map((book) => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          rating: book.rating,
          reviews: book.reviews,
          isbn: book.isbn,
          isbn13: book.isbn13,
          publisher: book.publisher,
          publishDate: book.publishDate,
          description: book.description?.substring(0, 100) + '...',
          priceSales: book.priceSales,
          priceStandard: book.priceStandard,
          category: {
            id: book.category?.id,
            name: book.category?.name,
          },
        }));

        return {
          categoryId: category.id,
          categoryName: category.name,
          books: discoveryBooks,
        };
      }),
    );

    // 결과에서 빈 카테고리 제외
    return result.filter((item) => item.books.length > 0);
  }

  /**
   * 키워드로 도서 검색
   * @param query 검색 쿼리
   * @param type 검색 타입 (all, title, author, publisher, isbn)
   * @param page 페이지 번호
   * @param limit 페이지당 결과 수
   */
  async searchBooks(
    query: string,
    type: string = 'Keyword',
    page: number = 1,
    limit: number = 10,
    searchParams: Partial<SearchBookDto> = {},
  ): Promise<{
    books: Book[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log(`알라딘 API로 도서 검색: ${query}, 타입: ${type}`);

      // 알라딘 API 호출 파라미터 구성
      const aladinParams: AladinBookSearchParams = {
        query,
        queryType: type as AladinQueryType,
        start: page,
        maxResults: limit,
        sort: searchParams.sort as AladinSort,
        searchTarget: searchParams.searchTarget as AladinSearchTarget,
        cover: searchParams.cover as AladinCover,
        categoryId: searchParams.categoryId,
        outofStockfilter: searchParams.outOfStockFilter ? 1 : 0,
        recentPublishFilter: searchParams.recentPublishFilter || 0,
        optResult: searchParams.optResult || ['toc', 'fulldescription'],
      };

      // 알라딘 API 호출
      const result = await this.aladinService.searchBooks(aladinParams);

      // 결과가 없는 경우 빈 결과 반환
      if (!result || !result.item || result.item.length === 0) {
        return {
          books: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // 검색 결과 처리
      const books = await Promise.all(
        result.item.map(async (item) => {
          // 이미 등록된 책인지 확인
          let book = await this.findByIsbn(item.isbn13 || item.isbn);

          if (!book) {
            // 새 책 정보 생성
            const bookData = this.aladinService.extractBookData(item);

            // 카테고리 처리 (알라딘 카테고리 ID와 매핑 필요)
            let categoryId = 1; // 기본 카테고리
            let subcategoryId = null;

            try {
              const category = await this.categoryService.findOne(categoryId);
              let subcategory = null;

              if (subcategoryId) {
                subcategory =
                  await this.subCategoryService.findOne(subcategoryId);
              }

              // 검색 시에는 DB에 저장하지 않고 메모리 상의 Book 객체만 생성
              const bookObject = {
                ...bookData,
                category,
                subcategory,
                // ISBN 필드 명시적 포함
                isbn: bookData.isbn || item.isbn,
                isbn13: bookData.isbn13 || item.isbn13,
                // 나머지 필드도 명시적으로 설정
                title: bookData.title,
                author: bookData.author,
                coverImage: bookData.coverImage,
                publisher: bookData.publisher,
                publishDate: bookData.publishDate,
                description: bookData.description,
                rating: bookData.rating || 0,
                reviews: bookData.reviews || 0,
                priceSales: bookData.priceSales,
                priceStandard: bookData.priceStandard,
                isFeatured: false,
                isDiscovered: false,
              };

              const tempBook = this.bookRepository.create(
                bookObject,
              ) as unknown as Book;

              // 관계 객체 설정 (TypeORM은 save 없이도 관계 객체를 설정할 수 있음)
              book = tempBook;
            } catch (error) {
              this.logger.error(`도서 객체 생성 오류: ${error.message}`);
              // 오류 발생 시 임시 Book 객체 생성
              const tempBook = this.bookRepository.create(
                bookData,
              ) as unknown as Book;
              book = tempBook;
            }
          }

          return book;
        }),
      );

      return {
        books,
        total: result.totalResults,
        page,
        totalPages: Math.ceil(result.totalResults / limit),
      };
    } catch (error) {
      this.logger.error(`도서 검색 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 베스트셀러 도서 검색
   */
  async findBestsellers(
    categoryId?: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    books: Book[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // 알라딘 API 호출 파라미터 구성
      const aladinParams = {
        queryType: 'Bestseller' as const,
        start: page,
        maxResults: limit,
        cover: 'Big' as const,
        categoryId: categoryId || 0,
        searchTarget: 'Book' as const,
      };

      // 알라딘 API 호출
      const result = await this.aladinService.getBookList(aladinParams);

      // 결과가 없는 경우 빈 결과 반환
      if (!result || !result.item || result.item.length === 0) {
        return {
          books: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // 베스트셀러 처리
      const books = await Promise.all(
        result.item.map(async (item) => {
          // 이미 등록된 책인지 확인
          let book = await this.findByIsbn(item.isbn13 || item.isbn);

          if (!book) {
            // 새 책 정보 생성
            const bookData = this.aladinService.extractBookData(item);

            // 카테고리 처리
            let categoryId = 1; // 기본 카테고리
            let subcategoryId = null;

            try {
              const category = await this.categoryService.findOne(categoryId);
              let subcategory = null;

              if (subcategoryId) {
                subcategory =
                  await this.subCategoryService.findOne(subcategoryId);
              }

              // 검색 시에는 DB에 저장하지 않고 메모리 상의 Book 객체만 생성
              const bookObject = {
                ...bookData,
                category,
                subcategory,
                // ISBN 필드 명시적 포함
                isbn: bookData.isbn || item.isbn,
                isbn13: bookData.isbn13 || item.isbn13,
                // 나머지 필드도 명시적으로 설정
                title: bookData.title,
                author: bookData.author,
                coverImage: bookData.coverImage,
                publisher: bookData.publisher,
                publishDate: bookData.publishDate,
                description: bookData.description,
                rating: bookData.rating || 0,
                reviews: bookData.reviews || 0,
                priceSales: bookData.priceSales,
                priceStandard: bookData.priceStandard,
                isFeatured: true,
                isDiscovered: false,
              };

              const tempBook = this.bookRepository.create(
                bookObject,
              ) as unknown as Book;

              // 관계 객체 설정
              book = tempBook;
            } catch (error) {
              this.logger.error(
                `베스트셀러 도서 객체 생성 오류: ${error.message}`,
              );
              const tempBook = this.bookRepository.create(
                bookData,
              ) as unknown as Book;
              book = tempBook;
            }
          }

          return book;
        }),
      );

      return {
        books,
        total: result.totalResults,
        page,
        totalPages: Math.ceil(result.totalResults / limit),
      };
    } catch (error) {
      this.logger.error(`베스트셀러 검색 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 신간 도서 검색
   */
  async findNewBooks(
    categoryId?: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    books: Book[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // 알라딘 API 호출 파라미터 구성
      const aladinParams = {
        queryType: 'ItemNewAll' as const,
        start: page,
        maxResults: limit,
        cover: 'Big' as const,
        categoryId: categoryId || 0,
        searchTarget: 'Book' as const,
      };

      // 알라딘 API 호출
      const result = await this.aladinService.getBookList(aladinParams);

      // 결과 처리 (베스트셀러와 유사)
      if (!result || !result.item || result.item.length === 0) {
        return {
          books: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      const books = await Promise.all(
        result.item.map(async (item) => {
          // 이미 등록된 책인지 확인
          let book = await this.findByIsbn(item.isbn13 || item.isbn);

          if (!book) {
            // 새 책 정보 생성 및 저장
            const bookData = this.aladinService.extractBookData(item);

            try {
              const category = await this.categoryService.findOne(1); // 기본 카테고리

              // 검색 시에는 DB에 저장하지 않고 메모리 상의 Book 객체만 생성
              const bookObject = {
                ...bookData,
                category,
                // ISBN 필드 명시적 포함
                isbn: bookData.isbn || item.isbn,
                isbn13: bookData.isbn13 || item.isbn13,
                // 나머지 필드도 명시적으로 설정
                title: bookData.title,
                author: bookData.author,
                coverImage: bookData.coverImage,
                publisher: bookData.publisher,
                publishDate: bookData.publishDate,
                description: bookData.description,
                rating: bookData.rating || 0,
                reviews: bookData.reviews || 0,
                priceSales: bookData.priceSales,
                priceStandard: bookData.priceStandard,
                isFeatured: false,
                isDiscovered: false,
              };

              const tempBook = this.bookRepository.create(
                bookObject,
              ) as unknown as Book;

              // 관계 객체 설정
              book = tempBook;
            } catch (error) {
              this.logger.error(`신간 도서 객체 생성 오류: ${error.message}`);
              const tempBook = this.bookRepository.create(
                bookData,
              ) as unknown as Book;
              book = tempBook;
            }
          }

          return book;
        }),
      );

      return {
        books,
        total: result.totalResults,
        page,
        totalPages: Math.ceil(result.totalResults / limit),
      };
    } catch (error) {
      this.logger.error(`신간 도서 검색 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * ISBN으로 도서 상세 정보 조회
   * 책이 DB에 없으면 알라딘 API에서 가져와서 DB에 저장합니다.
   */
  async getBookDetailByIsbn(isbn: string): Promise<Book> {
    // 이미 DB에 있는지 확인
    let book = await this.findByIsbn(isbn);

    if (book) {
      return book;
    }

    try {
      // 알라딘 API로 도서 정보 가져오기
      const result = await this.aladinService.getBookDetail({
        itemId: isbn,
        itemIdType: isbn.length === 13 ? 'ISBN13' : 'ISBN',
        cover: 'Big',
        optResult: [
          'toc',
          'authors',
          'fulldescription',
          'fullDescription2',
          'categoryIdList',
        ],
      });

      if (!result || !result.item || result.item.length === 0) {
        throw new NotFoundException(
          `ISBN ${isbn}으로 도서를 찾을 수 없습니다.`,
        );
      }

      const item = result.item[0];
      const bookData = this.aladinService.extractBookData(item);

      // 카테고리 처리 (기본값 사용)
      const category = await this.categoryService.findOne(1);

      // 책 데이터 DB에 저장
      const bookObject = {
        ...bookData,
        category,
        // ISBN과 ISBN13이 항상 포함되도록 명시
        isbn: bookData.isbn || isbn,
        isbn13: bookData.isbn13 || (isbn.length === 13 ? isbn : undefined),
        // 나머지 필드도 명시적으로 설정
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.coverImage,
        publisher: bookData.publisher,
        publishDate: bookData.publishDate,
        description: bookData.description,
        rating: bookData.rating || 0,
        reviews: bookData.reviews || 0,
        priceSales: bookData.priceSales,
        priceStandard: bookData.priceStandard,
        isFeatured: false,
        isDiscovered: false,
      };

      // 새 Book 엔티티 생성 및 저장
      const newBook = this.bookRepository.create(bookObject) as unknown as Book;
      const savedBook = await this.bookRepository.save(newBook);

      this.logger.log(
        `[ISBN 도서 저장] ${isbn}: ${savedBook.title} by ${savedBook.author}가 DB에 저장되었습니다.`,
      );
      return savedBook;
    } catch (error) {
      this.logger.error(`도서 상세 정보 조회 오류: ${error.message}`);
      throw new NotFoundException(`ISBN ${isbn}으로 도서를 찾을 수 없습니다.`);
    }
  }

  /**
   * 실시간 인기 검색어 조회
   * @param limit 결과 수
   */
  async getPopularSearchTerms(
    limit: number = 10,
  ): Promise<{ term: string; count: number }[]> {
    // 실제 구현에서는 Redis나 DB에서 인기 검색어를 집계해야 합니다.
    // 현재는 샘플 데이터를 반환합니다.
    return [
      { term: '고전문학', count: 2450 },
      { term: '플라톤', count: 1823 },
      { term: '논어', count: 1654 },
      { term: '니체', count: 1342 },
      { term: '소크라테스', count: 1265 },
      { term: '도스토예프스키', count: 1132 },
      { term: '국가', count: 987 },
      { term: '맹자', count: 854 },
    ].slice(0, limit);
  }

  /**
   * 최근 검색어 조회
   * @param userId 사용자 ID
   * @param limit 결과 수
   */
  async getRecentSearchTerms(
    userId: number,
    limit: number = 5,
  ): Promise<string[]> {
    // 실제 구현에서는 Redis나 DB에서 사용자별 최근 검색어를 가져와야 합니다.
    // 현재는 샘플 데이터를 반환합니다.
    return ['논어', '국가', '도덕경', '플라톤', '소크라테스'].slice(0, limit);
  }

  /**
   * 검색어 저장
   * @param term 검색어
   * @param userId 사용자 ID (선택적)
   * @param bookId 책 ID (선택적)
   */
  async saveSearchTerm(
    term: string,
    userId?: number,
    bookId?: number,
  ): Promise<void> {
    this.logger.log(
      `검색어 저장: "${term}" (userId: ${userId || 'anonymous'}, bookId: ${bookId || 'none'})`,
    );

    if (bookId) {
      try {
        // 책 ID가 제공된 경우 해당 책 정보 가져오기
        const book = await this.findById(bookId);

        // 검색 서비스에 책 정보와 함께 검색어 저장
        await this.searchService.saveSearchTerm(term, userId, {
          bookId: book.id,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          publisher: book.publisher,
          description: book.description,
        });
      } catch (error) {
        this.logger.error(`책 정보 조회 중 오류: ${error.message}`);
        // 오류가 발생해도 검색어만이라도 저장
        await this.searchService.saveSearchTerm(term, userId);
      }
    } else {
      // 책 ID가 없는 경우 검색어만 저장
      await this.searchService.saveSearchTerm(term, userId);
    }
  }
}
