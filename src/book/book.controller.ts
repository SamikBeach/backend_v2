import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Patch,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { BookService } from './book.service';
import { Book } from './entities/book.entity';
import {
  CreateBookDto,
  UpdateBookDto,
  BookResponse,
  ReadingStats,
} from './dto/book.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { RatingService } from '../rating/rating.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('book')
@Controller('book')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly readingStatusService: ReadingStatusService,
    private readonly ratingService: RatingService,
  ) {}

  @Get()
  @IsPublic()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }

  @Get('featured')
  @IsPublic()
  async findFeaturedBooks() {
    return this.bookService.findFeaturedBooks();
  }

  @Get('category/:categoryId')
  @IsPublic()
  async findByCategoryId(
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<Book[]> {
    return this.bookService.findByCategoryId(categoryId);
  }

  @Get('subcategory/:subcategoryId')
  @IsPublic()
  async findBySubcategoryId(
    @Param('subcategoryId', ParseIntPipe) subcategoryId: number,
  ): Promise<Book[]> {
    return this.bookService.findBySubcategoryId(subcategoryId);
  }

  @Get(':id')
  @IsPublic()
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: User,
  ): Promise<BookResponse> {
    console.log({ id });
    try {
      // 기본 책 정보 조회
      const book = await this.bookService.findById(id);

      // 응답 데이터 구성 - 기본 책 정보
      const response: BookResponse = {
        ...book,
        readingStats: null,
        userRating: null,
        userReadingStatus: null,
      };

      // 독서 상태 통계 정보 조회
      try {
        const readingStats =
          await this.readingStatusService.getBookReadingStats(
            book.id,
            user?.id,
          );

        if (readingStats) {
          // 통계 정보 설정
          response.readingStats = {
            currentReaders: readingStats.currentReaders,
            completedReaders: readingStats.completedReaders,
            averageReadingTime: readingStats.averageReadingTime,
            difficulty: readingStats.difficulty,
            readingStatusCounts: readingStats.readingStatusCounts,
          } as ReadingStats;

          // 사용자 독서 상태 설정 (로그인한 경우)
          if (user) {
            response.userReadingStatus = readingStats.userReadingStatus;
          }
        }
      } catch (error) {
        // 독서 상태 통계 조회 실패 시 무시하고 계속 진행
        console.error(`BookID ${id} 독서 상태 조회 중 오류 발생:`, error);
      }

      // 사용자 평점 정보 조회 (로그인한 경우)
      if (user) {
        try {
          const rating = await this.ratingService.findByUserAndBook(
            user.id,
            book.id,
          );
          if (rating) {
            response.userRating = {
              bookId: book.id,
              rating: rating.rating,
              comment: rating.comment,
            };
          }
        } catch (error) {
          // 평점 조회 실패 시 무시하고 계속 진행
          console.error(`BookID ${id} 평점 조회 중 오류 발생:`, error);
        }
      }

      return response;
    } catch (error) {
      console.error(`BookID ${id} 조회 중 오류 발생:`, error);
      throw new NotFoundException(`ID ${id}로 도서를 찾을 수 없습니다.`);
    }
  }

  @Get('isbn/:isbn')
  @IsPublic()
  async findByIsbn(
    @Param('isbn') isbn: string,
    @GetUser() user?: User,
  ): Promise<BookResponse> {
    try {
      // getBookDetailByIsbn 메서드는 DB에 없으면 알라딘에서 가져와 동일한 Book 형식으로 반환합니다.
      const book = await this.bookService.getBookDetailByIsbn(isbn);

      // 응답 데이터 구성 - 기본 책 정보
      const response: BookResponse = {
        ...book,
        readingStats: null,
        userRating: null,
        userReadingStatus: null,
      };

      // DB에 저장된 책이거나 임시 ID가 설정된 경우에만 추가 정보 조회
      if (book && book.id) {
        // DB에 실제로 저장된 책인 경우에만 독서 통계를 가져옴 (임시 ID는 제외)
        if (book.id > 0) {
          try {
            // 독서 상태 통계 정보 조회
            const readingStats =
              await this.readingStatusService.getBookReadingStats(
                book.id,
                user?.id,
              );

            if (readingStats) {
              // 통계 정보 설정
              response.readingStats = {
                currentReaders: readingStats.currentReaders,
                completedReaders: readingStats.completedReaders,
                averageReadingTime: readingStats.averageReadingTime,
                difficulty: readingStats.difficulty,
                readingStatusCounts: readingStats.readingStatusCounts,
              } as ReadingStats;

              // 사용자 독서 상태 설정 (로그인한 경우)
              if (user) {
                response.userReadingStatus = readingStats.userReadingStatus;
              }
            }
          } catch {
            // 독서 상태 통계 조회 실패 시 무시하고 계속 진행
          }

          // 사용자 평점 정보 조회 (로그인한 경우)
          if (user) {
            try {
              const rating = await this.ratingService.findByUserAndBook(
                user.id,
                book.id,
              );
              if (rating) {
                response.userRating = {
                  bookId: book.id,
                  rating: rating.rating,
                  comment: rating.comment,
                };
              }
            } catch {
              // 평점 조회 실패 시 무시하고 계속 진행
            }
          }
        }
      }

      return response;
    } catch (error) {
      console.error(`ISBN ${isbn} 조회 중 오류 발생:`, error);
      throw new NotFoundException(`ISBN ${isbn}으로 도서를 찾을 수 없습니다.`);
    }
  }

  @Post()
  async create(@Body() createBookDto: CreateBookDto): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    return this.bookService.update(id, updateBookDto);
  }

  @Post('initialize-featured')
  async initializeFeaturedBooks(
    @Query('categoryId') categoryId?: string,
    @Query('count') count?: number,
  ) {
    if (categoryId) {
      // 특정 카테고리의 인기 도서 초기화
      return this.bookService.initializeFeaturedBooksByCategory(
        Number(categoryId),
        count || 10,
      );
    } else {
      // 모든 카테고리의 인기 도서 초기화
      const result: Record<string, Book[]> = {};

      const categories = [
        'philosophy',
        'literature',
        'history',
        'political',
        'economics',
        'society',
        'science',
        'religion',
      ];

      for (const category of categories) {
        result[category] =
          await this.bookService.initializeFeaturedBooksByCategory(
            Number(category),
            count || 10,
          );
      }

      return result;
    }
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.remove(id);
  }

  // 분야별 인기 도서 API
  @Get('popular/category/:categoryId')
  @IsPublic()
  async findPopularBooksByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findPopularBooksByCategory(
      categoryId,
      subcategoryId ? Number(subcategoryId) : undefined,
      sort,
      timeRange,
    );
  }

  // 모든 분야의 인기 도서 API
  @Get('popular/all')
  @IsPublic()
  async findAllPopularBooks(
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findAllPopularBooks(sort, timeRange);
  }

  // 홈화면용 인기 도서 API
  @Get('popular/home')
  @IsPublic()
  async findPopularBooksForHome(@Query('limit') limit?: number): Promise<any> {
    return this.bookService.findPopularBooksForHome(limit || 4);
  }

  // 홈화면용 오늘의 발견 API
  @Get('discover/home')
  @IsPublic()
  async findDiscoverBooksForHome(@Query('limit') limit?: number): Promise<any> {
    return this.bookService.findDiscoverBooksForHome(limit || 6);
  }

  // ======= Discover 관련 엔드포인트 =======

  @Get('discover/all')
  @IsPublic()
  async findAllDiscoverBooks(
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findAllDiscoverBooks(sort, timeRange);
  }

  @Get('discover/category/:discoverCategoryId')
  @IsPublic()
  async findByDiscoverCategoryId(
    @Param('discoverCategoryId', ParseIntPipe) discoverCategoryId: number,
    @Query('discoverSubCategoryId') discoverSubCategoryId?: string,
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findByDiscoverCategoryId(
      discoverCategoryId,
      discoverSubCategoryId ? Number(discoverSubCategoryId) : undefined,
      sort,
      timeRange,
    );
  }

  @Get('discover/subcategory/:discoverSubCategoryId')
  @IsPublic()
  async findByDiscoverSubCategoryId(
    @Param('discoverSubCategoryId', ParseIntPipe) discoverSubCategoryId: number,
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findByDiscoverSubCategoryId(
      discoverSubCategoryId,
      sort,
      timeRange,
    );
  }

  @Post('discover/add')
  async addBookToDiscoverCategory(
    @Body('bookId', ParseIntPipe) bookId: number,
    @Body('discoverCategoryId', ParseIntPipe) discoverCategoryId: number,
    @Body('discoverSubCategoryId', ParseIntPipe) discoverSubCategoryId?: number,
  ): Promise<Book> {
    return this.bookService.addBookToDiscoverCategory(
      bookId,
      discoverCategoryId,
      discoverSubCategoryId,
    );
  }

  @Delete('discover/remove/:bookId')
  async removeBookFromDiscoverCategory(
    @Param('bookId', ParseIntPipe) bookId: number,
  ): Promise<Book> {
    return this.bookService.removeBookFromDiscoverCategory(bookId);
  }

  @Patch('discover/:id')
  async setBookDiscoverStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isDiscovered') isDiscovered: boolean,
  ): Promise<Book> {
    return this.bookService.setBookAsDiscovered(id, isDiscovered);
  }
}
