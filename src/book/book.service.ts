import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { AladinService } from '../common/services/aladin.service';
import { CategoryService } from '../category/category.service';

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    private readonly aladinService: AladinService,
    private readonly categoryService: CategoryService,
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
      throw new NotFoundException(`도서 ID ${id}를 찾을 수 없습니다.`);
    }

    return book;
  }

  /**
   * 카테고리에 속한 도서 조회
   */
  async findByCategoryId(categoryId: string): Promise<Book[]> {
    return this.bookRepository.find({
      where: { categoryId },
      relations: ['category', 'subcategory'],
      order: { rating: 'DESC' }, // 평점 높은 순으로 정렬
    });
  }

  /**
   * 서브카테고리에 속한 도서 조회
   */
  async findBySubcategoryId(subcategoryId: string): Promise<Book[]> {
    return this.bookRepository.find({
      where: { subcategoryId },
      relations: ['category', 'subcategory'],
      order: { rating: 'DESC' }, // 평점 높은 순으로 정렬
    });
  }

  /**
   * 모든 카테고리의 인기 도서 조회
   */
  async findFeaturedBooks(): Promise<Record<string, Book[]>> {
    // 모든 카테고리 조회
    const categories = await this.categoryService.findAll();

    // 각 카테고리별로 인기 도서 조회
    const result: Record<string, Book[]> = {};

    for (const category of categories) {
      // 해당 카테고리의 인기 도서 조회 (최대 10개)
      const books = await this.bookRepository.find({
        where: { categoryId: category.id },
        relations: ['subcategory'],
        order: { rating: 'DESC' },
        take: 10,
      });

      result[category.id] = books;
    }

    return result;
  }

  /**
   * 새 도서 생성
   */
  async create(createBookDto: CreateBookDto): Promise<Book> {
    // 카테고리와 서브카테고리 존재하는지 확인
    await this.categoryService.findById(createBookDto.categoryId);
    await this.categoryService.findSubcategoryById(createBookDto.subcategoryId);

    const book = this.bookRepository.create(createBookDto);
    return this.bookRepository.save(book);
  }

  /**
   * 도서 업데이트
   */
  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    // 도서 존재하는지 확인
    const book = await this.findById(id);

    // 카테고리나 서브카테고리가 변경되었다면 존재 여부 확인
    if (updateBookDto.categoryId) {
      await this.categoryService.findById(updateBookDto.categoryId);
    }

    if (updateBookDto.subcategoryId) {
      await this.categoryService.findSubcategoryById(
        updateBookDto.subcategoryId,
      );
    }

    // 업데이트
    const updatedBook = { ...book, ...updateBookDto };
    return this.bookRepository.save(updatedBook);
  }

  /**
   * ISBN으로 도서 검색
   */
  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.bookRepository.findOne({
      where: [{ isbn }, { isbn13: isbn }],
    });
  }

  /**
   * 알라딘 API로 도서 정보 가져오기
   */
  async fetchBookDetailsFromAladin(isbn: string): Promise<any> {
    try {
      const result = await this.aladinService.getBookDetail({
        itemId: isbn,
        itemIdType: isbn.length === 10 ? 'ISBN' : 'ISBN13',
      });

      if (!result || !result.item || result.item.length === 0) {
        throw new NotFoundException(
          `ISBN ${isbn}에 해당하는 도서를 찾을 수 없습니다.`,
        );
      }

      return result.item[0];
    } catch (error) {
      this.logger.error(
        `알라딘 API에서 도서 정보 가져오기 실패: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 카테고리별 인기 도서 초기화 (알라딘 API 사용)
   */
  async initializeFeaturedBooksByCategory(
    categoryId: string,
    count: number = 10,
  ): Promise<Book[]> {
    try {
      // 카테고리 확인
      const category = await this.categoryService.findById(categoryId);

      // 알라딘 카테고리 ID 매핑 (여기서는 간단한 예시, 실제로는 알라딘 카테고리 ID를 적절히 매핑해야 함)
      const aladinCategoryIds = {
        philosophy: 656, // 철학
        literature: 1, // 문학
        history: 74, // 역사
        political: 351, // 정치/사회
        economics: 170, // 경제/경영
        society: 798, // 사회학
        science: 987, // 과학
        religion: 1237, // 종교
      };

      const aladinCategoryId = aladinCategoryIds[categoryId] || 0;

      // 알라딘 API로 베스트셀러 조회
      const result = await this.aladinService.getBookList({
        queryType: 'Bestseller',
        maxResults: count,
        categoryId: aladinCategoryId,
      });

      if (!result || !result.item || result.item.length === 0) {
        this.logger.warn(
          `카테고리 ${categoryId}의 베스트셀러를 찾을 수 없습니다.`,
        );
        return [];
      }

      // 기존 도서 확인 및 없으면 생성
      const books: Book[] = [];

      for (const item of result.item) {
        // 서브카테고리 결정 로직 필요 (여기서는 첫 번째 서브카테고리 사용)
        const subcategories =
          await this.categoryService.findSubcategoriesByCategoryId(categoryId);
        const subcategoryId = subcategories[0]?.id || '';

        // 이미 존재하는지 확인
        let book = await this.findByIsbn(item.isbn13 || item.isbn);

        if (!book) {
          // 새 도서 생성
          const bookData = this.aladinService.extractBookData(
            item,
            categoryId,
            subcategoryId,
          );
          book = await this.create({
            ...bookData,
            isFeatured: true,
          });
        } else if (!book.isFeatured) {
          // 이미 존재하지만 인기 도서가 아니라면 업데이트
          book = await this.update(book.id, { isFeatured: true });
        }

        books.push(book);
      }

      return books;
    } catch (error) {
      this.logger.error(
        `카테고리 ${categoryId}의 인기 도서 초기화 실패: ${error.message}`,
      );
      throw error;
    }
  }
}
