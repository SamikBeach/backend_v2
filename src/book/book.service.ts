import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookDiscoverCategory } from './entities/book-discover-category.entity';
import {
  CreateBookDto,
  UpdateBookDto,
  BookResponse,
  BookSearchResponse,
} from './dto/book.dto';
import {
  AladinService,
  AladinBookSearchParams,
  AladinQueryType,
  AladinSort,
  AladinSearchTarget,
  AladinCover,
  AladinBook,
} from '../common/services/aladin.service';
import { CategoryService } from '../category/category.service';
import { SubCategoryService } from '../category/subcategory.service';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';
import { SearchBookDto } from './dto/search-book.dto';
import { SearchService } from '../search/search.service';
import { RatingService } from '../rating/rating.service';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { LibraryService } from '../library/library.service';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import { CreateSubCategoryDto } from '../category/dto/create-subcategory.dto';
import { Category } from '../category/entities/category.entity';
import { SubCategory } from '../category/entities/subcategory.entity';
import { ReviewService } from '../review/review.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(BookDiscoverCategory)
    private readonly bookDiscoverCategoryRepository: Repository<BookDiscoverCategory>,
    private readonly aladinService: AladinService,
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: SubCategoryService,
    private readonly discoverCategoryService: DiscoverCategoryService,
    @Inject(forwardRef(() => SearchService))
    private readonly searchService: SearchService,
    @Inject(forwardRef(() => RatingService))
    private readonly ratingService: RatingService,
    @Inject(forwardRef(() => ReadingStatusService))
    private readonly readingStatusService: ReadingStatusService,
    @Inject(forwardRef(() => LibraryService))
    private readonly libraryService: LibraryService,
    @Inject(forwardRef(() => ReviewService))
    private readonly reviewService: ReviewService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
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
   * ISBN 또는 ISBN13으로 도서 검색
   */
  async findByIsbn(isbnParam: string): Promise<Book | null> {
    // 로깅 추가
    this.logger.log(`[findByIsbn] ISBN 검색: ${isbnParam}`);

    let book = null;

    // ISBN13으로 먼저 검색 (정확한 매치)
    if (isbnParam.length === 13) {
      this.logger.log(`[findByIsbn] ISBN13으로 검색 시도: ${isbnParam}`);
      book = await this.bookRepository.findOne({
        where: { isbn13: isbnParam },
        relations: ['category', 'subcategory'],
      });

      if (book) {
        this.logger.log(
          `[findByIsbn] ISBN13으로 책 발견: ID ${book.id}, Title: ${book.title}`,
        );
        return book;
      }
    }

    // ISBN으로 검색 (정확한 매치)
    if (!book) {
      this.logger.log(`[findByIsbn] ISBN으로 검색 시도: ${isbnParam}`);
      book = await this.bookRepository.findOne({
        where: { isbn: isbnParam },
        relations: ['category', 'subcategory'],
      });

      if (book) {
        this.logger.log(
          `[findByIsbn] ISBN으로 책 발견: ID ${book.id}, Title: ${book.title}`,
        );
        return book;
      }
    }

    // 하이픈을 제거한 값으로도 검색
    if (!book && isbnParam.includes('-')) {
      const cleanIsbn = isbnParam.replace(/-/g, '');
      this.logger.log(`[findByIsbn] 하이픈 제거 후 검색 시도: ${cleanIsbn}`);

      book = await this.bookRepository.findOne({
        where: [{ isbn13: cleanIsbn }, { isbn: cleanIsbn }],
        relations: ['category', 'subcategory'],
      });

      if (book) {
        this.logger.log(
          `[findByIsbn] 하이픈 제거 후 책 발견: ID ${book.id}, Title: ${book.title}`,
        );
        return book;
      }
    }

    this.logger.log(`[findByIsbn] 책을 찾을 수 없음: ${isbnParam}`);
    return null;
  }

  /**
   * 알라딘 API로 도서 정보 가져오기
   */
  async fetchBookDetailsFromAladin(isbn: string): Promise<any> {
    try {
      const result = await this.aladinService.getBookDetail({ itemId: isbn });
      if (!result || !result.item || result.item.length === 0) {
        throw new NotFoundException(
          `Failed to fetch book details for ISBN ${isbn}`,
        );
      }

      // 첫 번째 아이템 선택
      const bookItem = result.item[0];

      // 책 데이터 추출
      const bookData = this.aladinService.extractBookData(bookItem);

      return bookData;
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
      let startDate: Date | null = null;

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
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        this.logger.log(
          `기간 필터 적용: ${timeRange}, 시작일: ${formattedDate}`,
        );

        // 날짜 형식을 일관되게 맞추기 위해 날짜 비교를 문자열로 변환
        queryBuilder.andWhere('DATE(book.publishDate) >= :startDate', {
          startDate: formattedDate,
        });

        // 필터링 후 남은 책 개수 로깅을 위한 카운트 쿼리
        const countAfterFilter = await queryBuilder.getCount();
        this.logger.log(`기간 필터 적용 후 남은 책 개수: ${countAfterFilter}`);
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
      let startDate: Date | null = null;

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
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        this.logger.log(
          `기간 필터 적용: ${timeRange}, 시작일: ${formattedDate}`,
        );

        // 날짜 형식을 일관되게 맞추기 위해 날짜 비교를 문자열로 변환
        queryBuilder.andWhere('DATE(book.publishDate) >= :startDate', {
          startDate: formattedDate,
        });

        // 필터링 후 남은 책 개수 로깅을 위한 카운트 쿼리
        const countAfterFilter = await queryBuilder.getCount();
        this.logger.log(`기간 필터 적용 후 남은 책 개수: ${countAfterFilter}`);
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
      .leftJoinAndSelect(
        'book.bookDiscoverCategories',
        'bookDiscoverCategories',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverCategory',
        'discoverCategory',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverSubCategory',
        'discoverSubCategory',
      )
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
      let startDate: Date | null = null;

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
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        this.logger.log(
          `기간 필터 적용: ${timeRange}, 시작일: ${formattedDate}`,
        );

        // 날짜 형식을 일관되게 맞추기 위해 날짜 비교를 문자열로 변환
        queryBuilder.andWhere('DATE(book.publishDate) >= :startDate', {
          startDate: formattedDate,
        });

        // 필터링 후 남은 책 개수 로깅을 위한 카운트 쿼리
        const countAfterFilter = await queryBuilder.getCount();
        this.logger.log(`기간 필터 적용 후 남은 책 개수: ${countAfterFilter}`);
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
      .leftJoinAndSelect(
        'book.bookDiscoverCategories',
        'bookDiscoverCategories',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverCategory',
        'discoverCategory',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverSubCategory',
        'discoverSubCategory',
      )
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
      .andWhere('discoverSubCategory.id = :discoverSubCategoryId', {
        discoverSubCategoryId,
      });

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;

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
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        this.logger.log(
          `기간 필터 적용: ${timeRange}, 시작일: ${formattedDate}`,
        );

        // 날짜 형식을 일관되게 맞추기 위해 날짜 비교를 문자열로 변환
        queryBuilder.andWhere('DATE(book.publishDate) >= :startDate', {
          startDate: formattedDate,
        });

        // 필터링 후 남은 책 개수 로깅을 위한 카운트 쿼리
        const countAfterFilter = await queryBuilder.getCount();
        this.logger.log(`기간 필터 적용 후 남은 책 개수: ${countAfterFilter}`);
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
   * 책을 발견하기 카테고리에 추가
   */
  async addBookToDiscoverCategory(
    bookId: number,
    discoverCategoryId: number,
    discoverSubCategoryId?: number,
    isbn?: string,
  ): Promise<Book> {
    let book: Book;

    try {
      // 1. 먼저 bookId로 책을 조회
      book = await this.findById(bookId);
    } catch (error) {
      // bookId가 유효하지 않고 isbn이 제공된 경우, isbn으로 책을 가져옴
      if (isbn) {
        this.logger.log(
          `책 ID ${bookId}가 존재하지 않아 ISBN ${isbn}으로 책 정보를 조회합니다.`,
        );
        try {
          // isbn으로 책을 가져와 DB에 저장 (saveToDb=true)
          book = await this.getBookDetailByIsbn(isbn, true);
          this.logger.log(
            `ISBN ${isbn}로 책을 가져와 DB에 저장했습니다. 책 ID: ${book.id}`,
          );
        } catch (isbnError) {
          this.logger.error(
            `ISBN ${isbn}로 책을 찾을 수 없습니다: ${isbnError.message}`,
          );
          throw new NotFoundException(
            `bookId ${bookId}와 isbn ${isbn} 모두 유효한 책을 찾을 수 없습니다.`,
          );
        }
      } else {
        // bookId가 유효하지 않고 isbn도 제공되지 않은 경우
        this.logger.error(
          `책 ID ${bookId}가 존재하지 않습니다: ${error.message}`,
        );
        throw error;
      }
    }

    // 발견하기 카테고리 조회
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

    // 이미 같은 카테고리/서브카테고리 조합이 존재하는지 확인
    const existingRelation = await this.bookDiscoverCategoryRepository.findOne({
      where: {
        bookId: book.id,
        discoverCategoryId: discoverCategoryId,
        discoverSubCategoryId: discoverSubCategoryId || null,
      },
    });

    if (existingRelation) {
      this.logger.log(
        `책 ID ${book.id}는 이미 discover category ${discoverCategoryId}${
          discoverSubCategoryId ? `, subcategory ${discoverSubCategoryId}` : ''
        }에 속해있습니다.`,
      );
      return book;
    }

    // 새로운 관계 생성
    const bookDiscoverCategory = this.bookDiscoverCategoryRepository.create({
      bookId: book.id,
      discoverCategoryId: discoverCategoryId,
      discoverSubCategoryId: discoverSubCategoryId || null,
    });

    await this.bookDiscoverCategoryRepository.save(bookDiscoverCategory);

    // 도서를 discovered로 설정
    book.isDiscovered = true;
    await this.bookRepository.save(book);

    return book;
  }

  /**
   * 도서를 DiscoverCategory에서 제거
   */
  async removeBookFromDiscoverCategory(bookId: number): Promise<Book> {
    const book = await this.findById(bookId);

    // 해당 책의 모든 discover category 관계 제거
    await this.bookDiscoverCategoryRepository.delete({ bookId: book.id });

    // 도서의 discovered 상태를 false로 설정
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
      .leftJoinAndSelect(
        'book.bookDiscoverCategories',
        'bookDiscoverCategories',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverCategory',
        'discoverCategory',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategories.discoverSubCategory',
        'discoverSubCategory',
      )
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true });

    // 기간 필터링
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;

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
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        this.logger.log(
          `기간 필터 적용: ${timeRange}, 시작일: ${formattedDate}`,
        );

        // 날짜 형식을 일관되게 맞추기 위해 날짜 비교를 문자열로 변환
        queryBuilder.andWhere('DATE(book.publishDate) >= :startDate', {
          startDate: formattedDate,
        });

        // 필터링 후 남은 책 개수 로깅을 위한 카운트 쿼리
        const countAfterFilter = await queryBuilder.getCount();
        this.logger.log(`기간 필터 적용 후 남은 책 개수: ${countAfterFilter}`);
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
  async findPopularBooksForHome(
    limit: number = 4,
  ): Promise<BookSearchResponse> {
    try {
      // 날짜 범위를 단계적으로 확장하며 충분한 책을 찾을 때까지 시도
      const dateRanges = [
        { days: 1, label: '오늘' }, // 오늘
        { days: 3, label: '최근 3일' }, // 최근 3일
        { days: 7, label: '최근 1주일' }, // 최근 1주일
        { days: 30, label: '최근 1개월' }, // 최근 1개월
      ];

      let activeBookIds: number[] = [];
      let usedDateRange = dateRanges[0].label;

      for (const range of dateRanges) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (range.days - 1)); // 1일이면 오늘, 3일이면 2일 전부터
        startDate.setHours(0, 0, 0, 0);

        this.logger.log(`${range.label} 활동 기준으로 인기 도서 조회 시도`);

        // 1. 해당 기간 동안 서재에 담긴 책 ID
        const libraryBookIds =
          await this.libraryService.getBookIdsAddedInPeriod(startDate);

        // 2. 해당 기간 동안 평점이 등록된 책 ID
        const ratingBookIds =
          await this.ratingService.getBookIdsRatedInPeriod(startDate);

        // 3. 해당 기간 동안 독서 상태가 변경된 책 ID
        const readingStatusBookIds =
          await this.readingStatusService.getBookIdsStatusChangedInPeriod(
            startDate,
          );

        // 4. 해당 기간 동안 리뷰가 작성된 책 ID
        const reviewBookIds =
          await this.reviewService.getBookIdsReviewedInPeriod(startDate);

        // 모든 ID를 합치고 중복 제거
        activeBookIds = [
          ...new Set([
            ...libraryBookIds,
            ...ratingBookIds,
            ...readingStatusBookIds,
            ...reviewBookIds,
          ]),
        ];

        this.logger.log(
          `${range.label} 활동이 있는 책: ${activeBookIds.length}개`,
        );

        // 충분한 책이 있으면 루프 종료
        if (activeBookIds.length >= limit) {
          usedDateRange = range.label;
          break;
        }
      }

      // 활성 도서가 있는 경우 해당 도서들을 반환
      if (activeBookIds.length > 0) {
        try {
          const activeBooks = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoinAndSelect('book.category', 'category')
            .leftJoinAndSelect('book.subcategory', 'subcategory')
            .where('book.id IN (:...ids)', { ids: activeBookIds })
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.reviews', 'DESC')
            .take(limit)
            .getMany();

          if (activeBooks.length > 0) {
            this.logger.log(
              `${usedDateRange} 기준 인기 도서 ${activeBooks.length}개를 반환합니다.`,
            );

            // 사용자별 데이터로 책 정보 보강
            const enrichedBooks = await Promise.all(
              activeBooks.map((book) => this.enrichBookWithUserData(book)),
            );

            return {
              books: enrichedBooks,
              total: enrichedBooks.length,
              page: 1,
              totalPages: 1,
            };
          }
        } catch (error) {
          this.logger.error(`활성 도서 조회 중 오류 발생: ${error.message}`);
          // 오류 발생 시 기본 인기 도서 반환 (fallback)
        }
      }

      // 활성 도서가 없거나 오류 발생 시 기본 인기 도서 반환 (fallback)
      this.logger.log('기본 인기 도서를 사용합니다.');

      const books = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.subcategory', 'subcategory')
        .orderBy('book.rating', 'DESC')
        .addOrderBy('book.reviews', 'DESC')
        .take(limit)
        .getMany();

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        books.map((book) => this.enrichBookWithUserData(book)),
      );

      return {
        books: enrichedBooks,
        total: enrichedBooks.length,
        page: 1,
        totalPages: 1,
      };
    } catch (error) {
      this.logger.error(`인기 도서 조회 중 치명적 오류 발생: ${error.message}`);
      return {
        books: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
    }
  }

  /**
   * 홈 화면용 오늘의 발견 도서 조회 (하루 단위 랜덤, 캐시)
   * @param limit 가져올 도서 수
   */
  async findDiscoverBooksForHome(
    limit: number = 4,
  ): Promise<BookSearchResponse> {
    const todayKey = `discover:home:${new Date().toISOString().slice(0, 10)}`;
    // 1. 캐시 확인
    const cached = await (this.cacheManager as any).get(todayKey);
    if (cached) {
      this.logger.log(`[findDiscoverBooksForHome] 캐시 반환 (${todayKey})`);
      return cached;
    }

    // 2. 랜덤 추출 (isDiscovered=true)
    const books = await this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .leftJoinAndSelect('book.bookDiscoverCategories', 'bookDiscoverCategory')
      .leftJoinAndSelect(
        'bookDiscoverCategory.discoverCategory',
        'discoverCategory',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategory.discoverSubCategory',
        'discoverSubCategory',
      )
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
      .orderBy('RAND()')
      .take(limit)
      .getMany();

    // enrich
    const enrichedBooks = await Promise.all(
      books.map((book) => this.enrichBookWithUserData(book)),
    );

    const result: BookSearchResponse = {
      books: enrichedBooks,
      total: enrichedBooks.length,
      page: 1,
      totalPages: 1,
    };

    // 3. 캐시 저장 (24시간)
    await (this.cacheManager as any).set(todayKey, result, 60 * 60 * 24);
    this.logger.log(
      `[findDiscoverBooksForHome] 랜덤 도서 캐시 저장 (${todayKey})`,
    );
    return result;
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
    userId?: number,
  ): Promise<BookSearchResponse> {
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
          // 이미 등록된 책인지 확인 (ISBN 또는 ISBN13으로 검색)
          let book = await this.findByIsbn(item.isbn13 || item.isbn);
          let isDbBook = false;

          if (!book) {
            // 새 책 정보 생성
            const bookData = this.aladinService.extractBookData(item);

            // 카테고리 및 서브카테고리 처리
            const { category, subcategory } = await this.processBookCategories(
              item,
              false,
            );

            try {
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
              this.logger.error(`책 객체 생성 오류: ${error.message}`);
              const tempBook = this.bookRepository.create(
                bookData,
              ) as unknown as Book;
              book = tempBook;
            }
          } else {
            isDbBook = book.id > 0;
          }

          // 데이터베이스에 저장된 책이고 (id > 0) 사용자 ID가 제공된 경우,
          // 읽기 상태 및 평점 정보 추가
          if (isDbBook) {
            return this.enrichBookWithUserData(book, userId);
          }

          // 데이터베이스에 없는 책은 기본 정보만 반환
          return {
            ...book,
            readingStats: null,
            userRating: null,
            userReadingStatus: null,
          } as BookResponse;
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
    userId?: number,
  ): Promise<BookSearchResponse> {
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

      // 결과가 없으면 빈 배열 반환
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

            // 카테고리 및 서브카테고리 처리
            const { category, subcategory } = await this.processBookCategories(
              item,
              false,
            );

            try {
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

          // 사용자 데이터로 책 정보 보강 - enrichBookWithUserData 활용
          return this.enrichBookWithUserData(book, userId);
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
    userId?: number,
  ): Promise<BookSearchResponse> {
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

      // 결과가 없으면 빈 배열 반환
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
              // 카테고리 및 서브카테고리 처리
              const { category, subcategory } =
                await this.processBookCategories(item, false);

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

          // 사용자 데이터로 책 정보 보강 (userId 직접 전달)
          return this.enrichBookWithUserData(book, userId);
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
   * ISBN으로 책 상세정보 조회 (DB에 없으면 알라딘 API에서 가져오고 saveToDb가 true면 저장)
   */
  async getBookDetailByIsbn(
    isbnParam: string,
    saveToDb: boolean = false,
  ): Promise<Book> {
    this.logger.log(`[getBookDetailByIsbn] 요청받은 ISBN: ${isbnParam}`);

    // 이미 DB에 있는지 확인
    try {
      const existingBook = await this.findByIsbn(isbnParam);
      if (existingBook) {
        this.logger.log(
          `[getBookDetailByIsbn] 기존 DB 레코드 사용: ISBN ${isbnParam}`,
        );
        return existingBook;
      }
    } catch (error) {
      this.logger.log(
        `[getBookDetailByIsbn] 기존 DB에 ISBN ${isbnParam} 존재하지 않음: ${error.message}`,
      );
      // 기존 책이 없는 경우, 계속해서 API 호출
    }

    try {
      // 알라딘 API로 도서 정보 가져오기
      const result = await this.aladinService.getBookDetail({
        itemId: isbnParam,
        itemIdType: isbnParam.length === 13 ? 'ISBN13' : 'ISBN',
        cover: 'Big',
        optResult: [
          'toc',
          'authors',
          'fulldescription',
          'fullDescription2',
          'categoryIdList',
        ],
      });

      this.logger.log(
        `[getBookDetailByIsbn] 알라딘 API 응답 확인: ${JSON.stringify(result?.item?.length ? 'Book found' : 'No book found')}`,
      );

      if (!result || !result.item || result.item.length === 0) {
        this.logger.error(
          `[getBookDetailByIsbn] 알라딘 API에서 ISBN ${isbnParam} 정보를 찾을 수 없음`,
        );
        throw new NotFoundException(
          `ISBN ${isbnParam}으로 도서를 찾을 수 없습니다.`,
        );
      }

      const item = result.item[0];
      const bookData = this.aladinService.extractBookData(item);

      // ISBN 및 ISBN13 로깅
      this.logger.log(
        `[getBookDetailByIsbn] 알라딘에서 가져온 정보 - ISBN: ${bookData.isbn}, ISBN13: ${bookData.isbn13}`,
      );

      // 카테고리 및 서브카테고리 처리
      const { category, subcategory } = await this.processBookCategories(
        item,
        saveToDb,
      );

      // 책 데이터 객체 생성
      const bookObject = {
        ...bookData,
        category,
        subcategory,
        // ISBN과 ISBN13이 항상 포함되도록 명시
        isbn: bookData.isbn || isbnParam,
        isbn13:
          bookData.isbn13 || (isbnParam.length === 13 ? isbnParam : undefined),
        // 나머지 필드도 명시적으로 설정
        title: bookData.title,
        author: bookData.author,
        translator: bookData.translator,
        coverImage: bookData.coverImage,
        publisher: bookData.publisher,
        publishDate: bookData.publishDate,
        description: bookData.description,
        rating: bookData.rating || 0,
        reviews: bookData.reviews || 0,
        totalRatings: bookData.totalRatings || 0,
        pageCount: bookData.pageCount,
        tags: bookData.tags,
        priceSales: bookData.priceSales,
        priceStandard: bookData.priceStandard,
        isFeatured: false,
        isDiscovered: false,
      };

      if (saveToDb) {
        // DB에 책 저장
        const savedBook = await this.bookRepository.save(bookObject);
        this.logger.log(
          `[getBookDetailByIsbn] ${isbnParam}: ${savedBook.title} by ${savedBook.author}를 알라딘 API에서 가져와 DB에 저장했습니다. (ID: ${savedBook.id})`,
        );
        return savedBook;
      } else {
        // 메모리 상에서만 Book 엔티티 객체 생성 (DB에 저장하지 않음)
        const tempBook = this.bookRepository.create({
          id: -1, // 임시 ID 설정 (DB에 없는 책임을 나타내는 음수값)
          ...bookObject,
        }) as unknown as Book;

        this.logger.log(
          `[getBookDetailByIsbn] ${isbnParam}: ${tempBook.title} by ${tempBook.author}를 알라딘 API에서 가져왔습니다. (DB 저장 안함, 임시 ID: ${tempBook.id})`,
        );

        return tempBook;
      }
    } catch (error) {
      this.logger.error(
        `[getBookDetailByIsbn] 도서 상세 정보 조회 오류 (ISBN: ${isbnParam}): ${error.message}`,
      );
      throw error;
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

  /**
   * 임시 ID를 가진 책을 저장
   */
  async saveBookWithTempId(book: Book | any): Promise<Book> {
    // id가 음수인 경우 (임시 ID)
    if (book && book.id < 0) {
      // id 필드를 제거하여 새로운 ID가 생성되게 함
      const { id, ...bookData } = book;

      // 카테고리 참조 확인
      let category = book.category;
      if (!category && book.categoryId) {
        category = await this.categoryService.findOne(book.categoryId);
      }
      // 카테고리가 없으면 기본값 설정
      if (!category) {
        category = await this.categoryService.findOne(1);
      }

      // 서브카테고리 참조 확인
      let subcategory = book.subcategory;
      if (!subcategory && book.subcategoryId) {
        subcategory = await this.subCategoryService.findOne(book.subcategoryId);
      }

      // 책 저장
      const savedBook = await this.bookRepository.save({
        ...bookData,
        category,
        subcategory,
      });

      this.logger.log(
        `임시 ID ${id}를 가진 책을 DB에 저장했습니다. 새 ID: ${savedBook.id}, 제목: ${savedBook.title}`,
      );

      return savedBook;
    }

    throw new Error('유효하지 않은 임시 책 데이터입니다.');
  }

  /**
   * 책의 리뷰 수를 감소시킵니다.
   */
  async decrementReviewCount(bookId: number): Promise<void> {
    try {
      // 책이 존재하는지 확인
      const book = await this.findById(bookId);

      if (!book) {
        throw new NotFoundException(`Book with ID ${bookId} not found`);
      }

      // 리뷰 수 감소 (0보다 작아지지 않도록)
      await this.bookRepository
        .createQueryBuilder()
        .update(Book)
        .set({ reviews: () => 'GREATEST(reviews - 1, 0)' })
        .where('id = :id', { id: bookId })
        .execute();

      this.logger.log(`책 ID ${bookId}의 리뷰 수가 감소되었습니다.`);
    } catch (error) {
      this.logger.error(`책 리뷰 수 감소 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 책의 리뷰 수를 증가시킵니다.
   */
  async incrementReviewCount(bookId: number): Promise<void> {
    try {
      // 책이 존재하는지 확인
      const book = await this.findById(bookId);

      if (!book) {
        throw new NotFoundException(`Book with ID ${bookId} not found`);
      }

      // 리뷰 수 증가
      await this.bookRepository
        .createQueryBuilder()
        .update(Book)
        .set({ reviews: () => 'reviews + 1' })
        .where('id = :id', { id: bookId })
        .execute();

      this.logger.log(`책 ID ${bookId}의 리뷰 수가 증가되었습니다.`);
    } catch (error) {
      this.logger.error(`책 리뷰 수 증가 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 책 기본 정보에 사용자별 추가 정보(읽기 상태, 평점)를 포함한 응답 데이터 생성
   */
  public async enrichBookWithUserData(
    book: Book,
    userId?: number,
  ): Promise<BookResponse> {
    if (book.id > 0 && userId) {
      // 사용자의 독서 상태 조회
      const readingStats = await this.readingStatusService.getBookReadingStats(
        book.id,
        userId,
      );

      // 사용자의 평점 조회
      const userRating = await this.ratingService.findByUserAndBook(
        userId,
        book.id,
      );

      return {
        ...book,
        readingStats,
        userRating,
        userReadingStatus: readingStats?.userReadingStatus || null,
      };
    }

    // 사용자 ID가 없는 경우 기본 정보만 반환
    return {
      ...book,
      readingStats: null,
      userRating: null,
      userReadingStatus: null,
    };
  }

  /**
   * 알라딘 API의 카테고리 정보를 파싱하고 처리
   * @param item 알라딘 API 응답의 책 정보
   * @param saveToDb 책이 DB에 저장될 예정인지 여부
   * @returns 카테고리와 서브카테고리 정보
   */
  async processBookCategories(
    item: AladinBook,
    saveToDb: boolean = false,
  ): Promise<{
    category: Category;
    subcategory: SubCategory | null;
  }> {
    try {
      let categoryName: string | null = null;
      let subcategoryName: string | null = null;

      // categoryName 필드에서 카테고리 정보 추출
      if (item.categoryName) {
        this.logger.log(`카테고리 정보 파싱: ${item.categoryName}`);
        const categories = item.categoryName.split('>');

        // "국내도서>에세이>한국에세이" 구조에서 "에세이"와 "한국에세이" 추출
        if (categories.length >= 2) {
          // 첫 번째 항목 "국내도서"는 무시하고 두 번째 항목을 카테고리로 설정
          categoryName = categories[1].trim();

          // 세 번째 항목이 존재하면 서브카테고리로 설정
          if (categories.length >= 3) {
            subcategoryName = categories[2].trim();
          }
        }
      }

      // 카테고리 정보가 없는 경우
      if (!categoryName) {
        // 알라딘에서 받은 정보에서 최소한의 정보로 임시 카테고리 생성
        const tempCategoryName = item.categoryName
          ? item.categoryName.split('>')[0].trim()
          : '분류 없음';

        const tempCategory = {
          id: -1,
          name: tempCategoryName,
          subCategories: [],
        } as Category;

        return {
          category: tempCategory,
          subcategory: null,
        };
      }

      // 카테고리 이름으로 검색
      let category = await this.categoryService.findByName(categoryName);

      // 카테고리 처리
      if (!category) {
        if (saveToDb) {
          // 카테고리가 없고 책을 DB에 저장할 예정인 경우에만 새로 생성
          this.logger.log(`새 카테고리 생성: ${categoryName}`);
          const createCategoryDto: CreateCategoryDto = { name: categoryName };
          category = await this.categoryService.create(createCategoryDto);
        } else {
          // 저장하지 않는 경우 알라딘에서 받은 정보로 임시 카테고리 생성
          category = {
            id: -1,
            name: categoryName,
            subCategories: [],
          } as Category;
        }
      }

      // 서브카테고리 처리
      let subcategory: SubCategory | null = null;
      if (subcategoryName && category) {
        // 해당 카테고리에 속한 서브카테고리 이름으로 검색
        subcategory = await this.categoryService.findSubCategoryByName(
          subcategoryName,
          category.id,
        );

        // 서브카테고리 처리
        if (!subcategory) {
          if (saveToDb) {
            // 서브카테고리가 없고 책을 DB에 저장할 예정인 경우에만 새로 생성
            this.logger.log(
              `새 서브카테고리 생성: ${subcategoryName} (카테고리: ${categoryName})`,
            );
            const createSubCategoryDto: CreateSubCategoryDto = {
              name: subcategoryName,
            };
            subcategory = await this.categoryService.createSubCategory(
              category.id,
              createSubCategoryDto,
            );
          } else {
            // 저장하지 않는 경우 알라딘에서 받은 정보로 임시 서브카테고리 생성
            subcategory = {
              id: -1,
              name: subcategoryName,
              category: category,
            } as SubCategory;
          }
        }
      }

      return { category, subcategory };
    } catch (error) {
      this.logger.error(`카테고리 처리 중 오류: ${error.message}`);

      // 오류 발생 시 알라딘 데이터로 임시 카테고리 객체 반환
      const tempCategoryName = item.categoryName
        ? item.categoryName.split('>')[0].trim()
        : '임시 카테고리';

      const tempCategory = {
        id: -1,
        name: tempCategoryName,
        subCategories: [],
      } as Category;

      return {
        category: tempCategory,
        subcategory: null,
      };
    }
  }

  /**
   * 인기 도서 조회 통합 API (카테고리/서브카테고리 필터링 및 페이징 지원)
   * @param categoryId 카테고리 ID (선택)
   * @param subcategoryId 서브카테고리 ID (선택)
   * @param sort 정렬 방식 (rating-desc, reviews-desc, library-desc, publishDate-desc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
   * @param page 페이지 번호
   * @param limit 페이지당 결과 수
   * @param userId 사용자 ID (선택, 사용자별 독서 상태와 평점 정보 포함)
   */
  async findPopularBooks(
    categoryId?: number,
    subcategoryId?: number,
    sort: string = 'rating-desc',
    timeRange: string = 'all',
    page: number = 1,
    limit: number = 20,
    userId?: number,
  ): Promise<BookSearchResponse> {
    this.logger.log(
      `인기 도서 조회 요청: 카테고리=${categoryId}, 서브카테고리=${subcategoryId}, 정렬=${sort}, 기간=${timeRange}`,
    );

    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory');

    // 서재 정렬을 위한 변수들
    let sortedBookIds: number[] = [];

    // 카테고리 필터링 (있는 경우)
    if (categoryId) {
      queryBuilder.where('category.id = :categoryId', { categoryId });

      // 서브카테고리 필터링 (있고 카테고리가 지정된 경우에만)
      if (subcategoryId) {
        queryBuilder.andWhere('subcategory.id = :subcategoryId', {
          subcategoryId,
        });
      }
    }

    // 기간 필터링 설정
    let startDate: Date | null = null;

    if (timeRange !== 'all') {
      const now = new Date();

      if (timeRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

      this.logger.log(
        `기간 필터 적용: ${timeRange}, 시작일: ${startDate?.toISOString()}`,
      );
    }

    // 서재에 담긴 순 정렬인 경우
    if (sort === 'library-desc') {
      // 기간 필터링 설정
      let filteredBookIds: number[] = [];

      // 기간 필터가 있는 경우, 먼저 기간 필터를 적용
      if (timeRange !== 'all' && startDate) {
        this.logger.log(
          `기간 필터 적용: ${timeRange} (${startDate.toISOString()}부터)`,
        );

        // 1. 해당 기간 동안 서재에 담긴 책 ID
        const libraryBookIds =
          await this.libraryService.getBookIdsAddedInPeriod(startDate);
        this.logger.log(`서재에 담긴 책: ${libraryBookIds.length}개`);

        // 2. 해당 기간 동안 평점이 등록된 책 ID
        const ratingBookIds =
          await this.ratingService.getBookIdsRatedInPeriod(startDate);
        this.logger.log(`평점이 등록된 책: ${ratingBookIds.length}개`);

        // 3. 해당 기간 동안 독서 상태가 변경된 책 ID
        const readingStatusBookIds =
          await this.readingStatusService.getBookIdsStatusChangedInPeriod(
            startDate,
          );
        this.logger.log(
          `읽기 상태가 변경된 책: ${readingStatusBookIds.length}개`,
        );

        // 4. 해당 기간 동안 리뷰가 작성된 책 ID
        const reviewBookIds =
          await this.reviewService.getBookIdsReviewedInPeriod(startDate);
        this.logger.log(`리뷰가 작성된 책: ${reviewBookIds.length}개`);

        // 모든 ID를 합치고 중복 제거
        filteredBookIds = [
          ...new Set([
            ...libraryBookIds,
            ...ratingBookIds,
            ...readingStatusBookIds,
            ...reviewBookIds,
          ]),
        ];

        this.logger.log(
          `기간 필터 적용 시 활동이 있는 책 총 개수: ${filteredBookIds.length}개`,
        );

        if (filteredBookIds.length === 0) {
          // 활동이 없는 경우 빈 결과 반환
          this.logger.log('기간 내 활동이 있는 책이 없습니다.');
          return {
            books: [],
            total: 0,
            page,
            totalPages: 0,
          };
        }

        // 카테고리/서브카테고리 필터링도 적용
        if (categoryId) {
          const booksInCategory = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoin('book.category', 'category')
            .leftJoin('book.subcategory', 'subcategory')
            .where('category.id = :categoryId', { categoryId })
            .andWhere(
              subcategoryId ? 'subcategory.id = :subcategoryId' : '1=1',
              subcategoryId ? { subcategoryId } : {},
            )
            .select('book.id')
            .getMany();

          const categoryBookIds = booksInCategory.map((book) => book.id);
          filteredBookIds = filteredBookIds.filter((id) =>
            categoryBookIds.includes(id),
          );

          this.logger.log(
            `카테고리/서브카테고리 필터 적용 후 책 개수: ${filteredBookIds.length}개`,
          );
        }
      } else {
        // 기간 필터가 없는 경우, 카테고리/서브카테고리 필터만 적용
        const queryBuilderForIds = this.bookRepository
          .createQueryBuilder('book')
          .leftJoin('book.category', 'category')
          .leftJoin('book.subcategory', 'subcategory')
          .select('book.id');

        if (categoryId) {
          queryBuilderForIds.where('category.id = :categoryId', { categoryId });

          if (subcategoryId) {
            queryBuilderForIds.andWhere('subcategory.id = :subcategoryId', {
              subcategoryId,
            });
          }
        }

        const allBooks = await queryBuilderForIds.getMany();
        filteredBookIds = allBooks.map((book) => book.id);
        this.logger.log(`필터 적용 전 책 총 ${filteredBookIds.length}개`);
      }

      // 서재에 담긴 수 가져오기 및 정렬
      if (filteredBookIds.length > 0) {
        const libraryCountResult = startDate
          ? await this.libraryService.getLibraryCountsByBooksAndPeriod(
              filteredBookIds,
              startDate,
            )
          : await this.libraryService.getLibraryCountsByBooks(filteredBookIds);

        // 서재에 담긴 책 ID만 추출
        const booksInLibrary = libraryCountResult.map((item) => item.bookId);

        // 서재에 담기지 않은 책 ID 추출
        const booksNotInLibrary = filteredBookIds.filter(
          (id) => !booksInLibrary.includes(id),
        );

        this.logger.log(
          `서재에 담긴 책: ${booksInLibrary.length}개, 담기지 않은 책: ${booksNotInLibrary.length}개`,
        );

        // 1. 서재에 담긴 책들을 담긴 순으로 먼저 정렬
        sortedBookIds = libraryCountResult.map((item) => item.bookId);

        // 2. 서재에 담기지 않은 책들도 평점 순으로 정렬하여 추가
        if (booksNotInLibrary.length > 0) {
          const booksNotInLibraryData = await this.bookRepository
            .createQueryBuilder('book')
            .where('book.id IN (:...ids)', { ids: booksNotInLibrary })
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.reviews', 'DESC')
            .getMany();

          const additionalBookIds = booksNotInLibraryData.map(
            (book) => book.id,
          );
          sortedBookIds = [...sortedBookIds, ...additionalBookIds];
        }

        // 로깅: 상위 5개 항목
        if (sortedBookIds.length > 0 && libraryCountResult.length > 0) {
          const top5 = libraryCountResult.slice(
            0,
            Math.min(5, libraryCountResult.length),
          );
          this.logger.log(
            `서재 담긴 순 상위 5개: ${top5.map((item) => `ID:${item.bookId}(${item.libraryCount}권)`).join(', ')}`,
          );
        }
      } else {
        this.logger.log('필터 조건에 맞는 책이 없습니다');
        sortedBookIds = [];
      }

      // 전체 결과 수는 ID 배열 길이
      const total = sortedBookIds.length;

      // 페이징 적용
      const skip = (page - 1) * limit;
      const pagedBookIds = sortedBookIds.slice(skip, skip + limit);

      this.logger.log(
        `페이지 ${page}, 항목 수 ${limit}, 반환할 책 수: ${pagedBookIds.length}`,
      );

      // 페이징된 ID에 해당하는 책 조회
      const books =
        pagedBookIds.length > 0
          ? await this.bookRepository
              .createQueryBuilder('book')
              .leftJoinAndSelect('book.category', 'category')
              .leftJoinAndSelect('book.subcategory', 'subcategory')
              .where('book.id IN (:...ids)', { ids: pagedBookIds })
              .getMany()
          : [];

      // ID 순서대로 책을 정렬 (IN 쿼리는 순서를 보장하지 않음)
      const orderedBooks = pagedBookIds
        .map((id) => books.find((book) => book.id === id))
        .filter(Boolean) as Book[];

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        orderedBooks.map((book) => this.enrichBookWithUserData(book, userId)),
      );

      return {
        books: enrichedBooks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } else if (timeRange !== 'all') {
      // 기간 필터가 있고 서재순이 아닌 다른 정렬의 경우
      // 먼저 해당 기간 동안의 활동이 있는 책 ID를 가져옵니다

      this.logger.log(
        `기간 필터 적용: ${timeRange} (${startDate?.toISOString()}부터)`,
      );

      // 1. 해당 기간 동안 서재에 담긴 책 ID
      const libraryBookIds = await this.libraryService.getBookIdsAddedInPeriod(
        startDate as Date,
      );
      this.logger.log(`서재에 담긴 책: ${libraryBookIds.length}개`);

      // 2. 해당 기간 동안 평점이 등록된 책 ID
      const ratingBookIds = await this.ratingService.getBookIdsRatedInPeriod(
        startDate as Date,
      );
      this.logger.log(`평점이 등록된 책: ${ratingBookIds.length}개`);

      // 3. 해당 기간 동안 독서 상태가 변경된 책 ID
      const readingStatusBookIds =
        await this.readingStatusService.getBookIdsStatusChangedInPeriod(
          startDate as Date,
        );
      this.logger.log(
        `읽기 상태가 변경된 책: ${readingStatusBookIds.length}개`,
      );

      // 4. 해당 기간 동안 리뷰가 작성된 책 ID
      const reviewBookIds = await this.reviewService.getBookIdsReviewedInPeriod(
        startDate as Date,
      );
      this.logger.log(`리뷰가 작성된 책: ${reviewBookIds.length}개`);

      // 모든 ID를 합치고 중복 제거
      const allActivityBookIds = [
        ...new Set([
          ...libraryBookIds,
          ...ratingBookIds,
          ...readingStatusBookIds,
          ...reviewBookIds,
        ]),
      ];

      this.logger.log(
        `기간 필터 적용 시 활동이 있는 책 총 개수: ${allActivityBookIds.length}개`,
      );

      if (allActivityBookIds.length === 0) {
        // 활동이 없는 경우 빈 결과 반환
        this.logger.log('기간 내 활동이 있는 책이 없습니다.');
        return {
          books: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // 활동이 있는 책만 필터링
      queryBuilder.andWhere('book.id IN (:...ids)', {
        ids: allActivityBookIds,
      });

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
        case 'title-asc':
          queryBuilder.orderBy('book.title', 'ASC');
          break;
        default:
          queryBuilder.orderBy('book.rating', 'DESC');
      }

      // 전체 결과 수 조회
      const total = await queryBuilder.getCount();

      // 페이징 적용
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      // 결과 가져오기
      const books = await queryBuilder.getMany();

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        books.map((book) => this.enrichBookWithUserData(book, userId)),
      );

      return {
        books: enrichedBooks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    // 일반 정렬 적용 (기간 필터 없는 경우)
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
      case 'title-asc':
        queryBuilder.orderBy('book.title', 'ASC');
        break;
      default:
        queryBuilder.orderBy('book.rating', 'DESC');
    }

    // 전체 결과 수 조회
    const total = await queryBuilder.getCount();

    // 페이징 적용
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 결과 가져오기
    const books = await queryBuilder.getMany();

    // 사용자별 데이터로 책 정보 보강
    const enrichedBooks = await Promise.all(
      books.map((book) => this.enrichBookWithUserData(book, userId)),
    );

    return {
      books: enrichedBooks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 발견하기 도서 조회 통합 API (카테고리/서브카테고리 필터링 및 페이징 지원)
   * @param discoverCategoryId 발견하기 카테고리 ID (선택)
   * @param discoverSubCategoryId 발견하기 서브카테고리 ID (선택)
   * @param sort 정렬 방식 (rating-desc, reviews-desc, library-desc, publishDate-desc, title-asc)
   * @param timeRange 기간 필터 (all: 전체 기간, today: 오늘, week: 이번 주, month: 이번 달, year: 올해)
   * @param page 페이지 번호
   * @param limit 페이지당 결과 수
   * @param userId 사용자 ID (선택, 사용자별 독서 상태와 평점 정보 포함)
   */
  async findDiscoverBooks(
    discoverCategoryId?: number,
    discoverSubCategoryId?: number,
    sort: string = 'rating-desc',
    timeRange: string = 'all',
    page: number = 1,
    limit: number = 20,
    userId?: number,
  ): Promise<BookSearchResponse> {
    this.logger.log(
      `발견하기 도서 조회 요청: 카테고리=${discoverCategoryId}, 서브카테고리=${discoverSubCategoryId}, 정렬=${sort}`,
    );

    // 기간 필터 처리
    let startDate: Date | null = null;
    if (timeRange !== 'all') {
      const now = new Date();
      switch (timeRange) {
        case 'today':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    this.logger.log(
      `발견하기 도서 조회 요청: 카테고리=${discoverCategoryId}, 서브카테고리=${discoverSubCategoryId}, 정렬=${sort}, 기간=${timeRange}`,
    );

    // 기본 쿼리 빌더 생성
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.subcategory', 'subcategory')
      .leftJoinAndSelect('book.bookDiscoverCategories', 'bookDiscoverCategory')
      .leftJoinAndSelect(
        'bookDiscoverCategory.discoverCategory',
        'discoverCategory',
      )
      .leftJoinAndSelect(
        'bookDiscoverCategory.discoverSubCategory',
        'discoverSubCategory',
      )
      .where('book.isDiscovered = :isDiscovered', { isDiscovered: true });

    // 카테고리 필터 적용
    if (discoverCategoryId) {
      queryBuilder.andWhere('discoverCategory.id = :discoverCategoryId', {
        discoverCategoryId,
      });

      if (discoverSubCategoryId) {
        queryBuilder.andWhere(
          'discoverSubCategory.id = :discoverSubCategoryId',
          { discoverSubCategoryId },
        );
      }
    } else if (discoverSubCategoryId) {
      queryBuilder.andWhere('discoverSubCategory.id = :discoverSubCategoryId', {
        discoverSubCategoryId,
      });
    }

    // 서재에 담긴순 정렬의 경우 특별 처리
    if (sort === 'library-desc') {
      let filteredBookIds: number[] = [];
      let sortedBookIds: number[] = [];

      // 발견하기 도서 중에서 카테고리 필터 적용 (카테고리가 없으면 모든 발견하기 도서)
      const queryBuilderForIds = this.bookRepository
        .createQueryBuilder('book')
        .leftJoin('book.bookDiscoverCategories', 'bookDiscoverCategory')
        .leftJoin('bookDiscoverCategory.discoverCategory', 'discoverCategory')
        .leftJoin(
          'bookDiscoverCategory.discoverSubCategory',
          'discoverSubCategory',
        )
        .where('book.isDiscovered = :isDiscovered', { isDiscovered: true })
        .select('book.id');

      if (discoverCategoryId) {
        queryBuilderForIds.andWhere(
          'discoverCategory.id = :discoverCategoryId',
          { discoverCategoryId },
        );

        if (discoverSubCategoryId) {
          queryBuilderForIds.andWhere(
            'discoverSubCategory.id = :discoverSubCategoryId',
            {
              discoverSubCategoryId,
            },
          );
        }
      } else if (discoverSubCategoryId) {
        queryBuilderForIds.andWhere(
          'discoverSubCategory.id = :discoverSubCategoryId',
          {
            discoverSubCategoryId,
          },
        );
      }

      const allBooks = await queryBuilderForIds.getMany();
      filteredBookIds = allBooks.map((book) => book.id);
      this.logger.log(`필터 적용 후 책 총 ${filteredBookIds.length}개`);

      // 서재에 담긴 수 가져오기 및 정렬
      if (filteredBookIds.length > 0) {
        const libraryCountResult = startDate
          ? await this.libraryService.getLibraryCountsByBooksAndPeriod(
              filteredBookIds,
              startDate,
            )
          : await this.libraryService.getLibraryCountsByBooks(filteredBookIds);

        // 서재에 담긴 책 ID만 추출
        const booksInLibrary = libraryCountResult.map((item) => item.bookId);

        // 서재에 담기지 않은 책 ID 추출
        const booksNotInLibrary = filteredBookIds.filter(
          (id) => !booksInLibrary.includes(id),
        );

        this.logger.log(
          `서재에 담긴 책: ${booksInLibrary.length}개, 담기지 않은 책: ${booksNotInLibrary.length}개`,
        );

        // 1. 서재에 담긴 책들을 담긴 순으로 먼저 정렬
        sortedBookIds = libraryCountResult.map((item) => item.bookId);

        // 2. 서재에 담기지 않은 책들도 평점 순으로 정렬하여 추가
        if (booksNotInLibrary.length > 0) {
          const booksNotInLibraryData = await this.bookRepository
            .createQueryBuilder('book')
            .where('book.id IN (:...ids)', { ids: booksNotInLibrary })
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.reviews', 'DESC')
            .getMany();

          const additionalBookIds = booksNotInLibraryData.map(
            (book) => book.id,
          );
          sortedBookIds = [...sortedBookIds, ...additionalBookIds];
        }

        // 로깅: 상위 5개 항목
        if (sortedBookIds.length > 0 && libraryCountResult.length > 0) {
          const top5 = libraryCountResult.slice(
            0,
            Math.min(5, libraryCountResult.length),
          );
          this.logger.log(
            `서재 담긴 순 상위 5개: ${top5.map((item) => `ID:${item.bookId}(${item.libraryCount}권)`).join(', ')}`,
          );
        }
      } else {
        this.logger.log('필터 조건에 맞는 책이 없습니다');
        sortedBookIds = [];
      }

      // 전체 결과 수는 ID 배열 길이
      const total = sortedBookIds.length;

      // 페이징 적용
      const skip = (page - 1) * limit;
      const pagedBookIds = sortedBookIds.slice(skip, skip + limit);

      this.logger.log(
        `페이지 ${page}, 항목 수 ${limit}, 반환할 책 수: ${pagedBookIds.length}`,
      );

      // 페이징된 ID에 해당하는 책 조회
      const books =
        pagedBookIds.length > 0
          ? await this.bookRepository
              .createQueryBuilder('book')
              .leftJoinAndSelect('book.category', 'category')
              .leftJoinAndSelect('book.subcategory', 'subcategory')
              .leftJoinAndSelect(
                'book.bookDiscoverCategories',
                'bookDiscoverCategory',
              )
              .leftJoinAndSelect(
                'bookDiscoverCategory.discoverCategory',
                'discoverCategory',
              )
              .leftJoinAndSelect(
                'bookDiscoverCategory.discoverSubCategory',
                'discoverSubCategory',
              )
              .where('book.id IN (:...ids)', { ids: pagedBookIds })
              .getMany()
          : [];

      // ID 순서대로 책을 정렬 (IN 쿼리는 순서를 보장하지 않음)
      const orderedBooks = pagedBookIds
        .map((id) => books.find((book) => book.id === id))
        .filter(Boolean) as Book[];

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        orderedBooks.map((book) => this.enrichBookWithUserData(book, userId)),
      );

      return {
        books: enrichedBooks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } else if (timeRange !== 'all') {
      // 기간 필터가 있고 서재순이 아닌 다른 정렬의 경우
      // 먼저 해당 기간 동안의 활동이 있는 책 ID를 가져옵니다

      this.logger.log(
        `기간 필터 적용: ${timeRange} (${startDate?.toISOString()}부터)`,
      );

      // 1. 해당 기간 동안 서재에 담긴 책 ID
      const libraryBookIds = await this.libraryService.getBookIdsAddedInPeriod(
        startDate as Date,
      );
      this.logger.log(`서재에 담긴 책: ${libraryBookIds.length}개`);

      // 2. 해당 기간 동안 평점이 등록된 책 ID
      const ratingBookIds = await this.ratingService.getBookIdsRatedInPeriod(
        startDate as Date,
      );
      this.logger.log(`평점이 등록된 책: ${ratingBookIds.length}개`);

      // 3. 해당 기간 동안 독서 상태가 변경된 책 ID
      const readingStatusBookIds =
        await this.readingStatusService.getBookIdsStatusChangedInPeriod(
          startDate as Date,
        );
      this.logger.log(
        `읽기 상태가 변경된 책: ${readingStatusBookIds.length}개`,
      );

      // 4. 해당 기간 동안 리뷰가 작성된 책 ID
      const reviewBookIds = await this.reviewService.getBookIdsReviewedInPeriod(
        startDate as Date,
      );
      this.logger.log(`리뷰가 작성된 책: ${reviewBookIds.length}개`);

      // 모든 ID를 합치고 중복 제거
      const allActivityBookIds = [
        ...new Set([
          ...libraryBookIds,
          ...ratingBookIds,
          ...readingStatusBookIds,
          ...reviewBookIds,
        ]),
      ];

      this.logger.log(
        `기간 필터 적용 시 활동이 있는 책 총 개수: ${allActivityBookIds.length}개`,
      );

      if (allActivityBookIds.length === 0) {
        // 활동이 없는 경우 빈 결과 반환
        this.logger.log('기간 내 활동이 있는 책이 없습니다.');
        return {
          books: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // 활동이 있는 책만 필터링
      queryBuilder.andWhere('book.id IN (:...ids)', {
        ids: allActivityBookIds,
      });

      // 정렬 적용
      switch (sort) {
        case 'rating-desc':
          queryBuilder
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.totalRatings', 'DESC');
          break;
        case 'reviews-desc':
          queryBuilder
            .orderBy('book.reviews', 'DESC')
            .addOrderBy('book.rating', 'DESC');
          break;
        case 'publishDate-desc':
          queryBuilder
            .orderBy('book.publishDate', 'DESC')
            .addOrderBy('book.rating', 'DESC');
          break;
        case 'title-asc':
          queryBuilder.orderBy('book.title', 'ASC');
          break;
        default:
          queryBuilder
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.totalRatings', 'DESC');
      }

      // 페이징 적용
      const total = await queryBuilder.getCount();
      const books = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        books.map((book) => this.enrichBookWithUserData(book, userId)),
      );

      return {
        books: enrichedBooks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } else {
      // 기간 필터가 없는 경우 일반 정렬
      switch (sort) {
        case 'rating-desc':
          queryBuilder
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.totalRatings', 'DESC');
          break;
        case 'reviews-desc':
          queryBuilder
            .orderBy('book.reviews', 'DESC')
            .addOrderBy('book.rating', 'DESC');
          break;
        case 'publishDate-desc':
          queryBuilder
            .orderBy('book.publishDate', 'DESC')
            .addOrderBy('book.rating', 'DESC');
          break;
        case 'title-asc':
          queryBuilder.orderBy('book.title', 'ASC');
          break;
        default:
          queryBuilder
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.totalRatings', 'DESC');
      }

      // 페이징 적용
      const total = await queryBuilder.getCount();
      const books = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      // 사용자별 데이터로 책 정보 보강
      const enrichedBooks = await Promise.all(
        books.map((book) => this.enrichBookWithUserData(book, userId)),
      );

      return {
        books: enrichedBooks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  /**
   * 홈 화면용 오늘의 분야별 인기 도서 조회
   * @param limit 가져올 도서 수
   */
  async findPopularBooksByCategoryForHome(limit: number = 6): Promise<any> {
    // 오늘 날짜 기준 설정
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 모든 카테고리 가져오기
    const categories = await this.categoryService.findAll();

    if (!categories.length) {
      return [];
    }

    // 활성화된 상위 3개 카테고리만 사용
    const activeCategories = categories.slice(0, 3);

    // 오늘 활동이 있는 책 ID 가져오기
    // 1. 오늘 서재에 담긴 책 ID
    const libraryBookIds =
      await this.libraryService.getBookIdsAddedInPeriod(today);

    // 2. 오늘 평점이 등록된 책 ID
    const ratingBookIds =
      await this.ratingService.getBookIdsRatedInPeriod(today);

    // 3. 오늘 독서 상태가 변경된 책 ID
    const readingStatusBookIds =
      await this.readingStatusService.getBookIdsStatusChangedInPeriod(today);

    // 4. 오늘 리뷰가 작성된 책 ID
    const reviewBookIds =
      await this.reviewService.getBookIdsReviewedInPeriod(today);

    // 모든 ID를 합치고 중복 제거
    const activeBookIds = [
      ...new Set([
        ...libraryBookIds,
        ...ratingBookIds,
        ...readingStatusBookIds,
        ...reviewBookIds,
      ]),
    ];

    this.logger.log(`오늘 활동이 있는 책: ${activeBookIds.length}개`);

    // 각 카테고리에 속한 도서 가져오기
    const result = await Promise.all(
      activeCategories.map(async (category) => {
        let books;

        // 오늘 활동이 있는 책이 있는 경우 해당 책 중에서 필터링
        if (activeBookIds.length > 0) {
          books = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoinAndSelect('book.category', 'category')
            .leftJoinAndSelect('book.subcategory', 'subcategory')
            .where('category.id = :categoryId', { categoryId: category.id })
            .andWhere('book.id IN (:...ids)', { ids: activeBookIds })
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.reviews', 'DESC')
            .take(limit / activeCategories.length)
            .getMany();
        } else {
          // 오늘 활동이 없으면 기존 방식으로 가져오기 (fallback)
          books = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoinAndSelect('book.category', 'category')
            .leftJoinAndSelect('book.subcategory', 'subcategory')
            .where('category.id = :categoryId', { categoryId: category.id })
            .orderBy('book.rating', 'DESC')
            .addOrderBy('book.reviews', 'DESC')
            .take(limit / activeCategories.length)
            .getMany();
        }

        // 도서 정보 가공
        const categoryBooks = books.map((book) => ({
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
          subcategory: book.subcategory
            ? {
                id: book.subcategory.id,
                name: book.subcategory.name,
              }
            : null,
        }));

        return {
          categoryId: category.id,
          categoryName: category.name,
          books: categoryBooks,
        };
      }),
    );

    // 결과에서 빈 카테고리 제외
    return result.filter((item) => item.books.length > 0);
  }
}
