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
  UseGuards,
} from '@nestjs/common';
import { BookService } from './book.service';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { RatingService } from '../rating/rating.service';

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
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.bookService.findById(id);
  }

  @Get('isbn/:isbn')
  @IsPublic()
  async findByIsbn(
    @Param('isbn') isbn: string,
    @GetUser() user?: User,
  ): Promise<any> {
    try {
      console.log('==========[findByIsbn]==========');
      console.log('요청 정보 - ISBN:', isbn);
      console.log(
        '인증 유저 정보:',
        user ? `ID: ${user.id}, Email: ${user.email}` : '인증된 사용자 없음',
      );
      console.log('================================');

      // getBookDetailByIsbn 메서드는 DB에 없으면 알라딘에서 가져와 동일한 Book 형식으로 반환합니다.
      const book = await this.bookService.getBookDetailByIsbn(isbn);
      console.log(
        '조회된 책 정보:',
        book.id
          ? `ID: ${book.id}, Title: ${book.title}`
          : `Title: ${book.title} (ID 없음)`,
      );

      // 응답 데이터 구성 - 기본 책 정보
      const response: any = {
        ...book,
        readingStats: null,
        userRating: null,
        userReadingStatus: null,
      };

      // DB에 저장된 책이거나 임시 ID가 설정된 경우에만 추가 정보 조회
      if (book && book.id) {
        console.log('책 ID:', book.id, book.id < 0 ? '(임시 ID)' : '(DB ID)');

        // DB에 실제로 저장된 책인 경우에만 독서 통계를 가져옴 (임시 ID는 제외)
        if (book.id > 0) {
          try {
            // 독서 상태 통계 정보 조회
            console.log(
              '독서 상태 통계 조회 시작 - 책 ID:',
              book.id,
              '유저 ID:',
              user?.id,
            );
            const readingStats =
              await this.readingStatusService.getBookReadingStats(
                book.id,
                user?.id,
              );
            console.log(
              '독서 상태 통계 조회 결과:',
              readingStats ? '성공' : '데이터 없음',
            );

            if (readingStats) {
              // 통계 정보 설정
              response.readingStats = {
                currentReaders: readingStats.currentReaders,
                completedReaders: readingStats.completedReaders,
                averageReadingTime: readingStats.averageReadingTime,
                difficulty: readingStats.difficulty,
                readingStatusCounts: readingStats.readingStatusCounts,
              };

              // 사용자 독서 상태 설정 (로그인한 경우)
              if (user) {
                console.log(
                  '유저 독서 상태:',
                  readingStats.userReadingStatus || '상태 없음',
                );
                response.userReadingStatus = readingStats.userReadingStatus;
              }
            }
          } catch (error) {
            console.warn(`독서 상태 통계 조회 실패: ${error.message}`);
            console.error(error);
          }
        }

        // 로그인한 사용자인 경우 평점 정보 조회 (DB에 저장된 책인 경우만)
        if (user && book.id > 0) {
          // 사용자의 평점 정보 조회 - null 반환 가능
          console.log(
            '유저 평점 조회 시작 - 유저 ID:',
            user.id,
            '책 ID:',
            book.id,
          );
          try {
            const userRating = await this.ratingService.findByUserAndBook(
              user.id,
              book.id,
            );
            console.log(
              '유저 평점 조회 결과:',
              userRating ? `평점: ${userRating.rating}` : '평점 없음',
            );

            // 평점 정보가 있으면 응답에 포함
            response.userRating = userRating;
          } catch (error) {
            console.warn(`평점 정보 조회 실패: ${error.message}`);
            console.error(error);
            response.userRating = null;
          }
        } else {
          // 비로그인 사용자이거나 임시 ID 책인 경우
          if (!user) {
            console.log('비로그인 상태: 유저 정보 null 설정');
          } else if (book.id < 0) {
            console.log('임시 ID 책: 평점 정보 조회 불가');
          }
          response.userRating = null;
          response.userReadingStatus = null;
        }
      } else {
        // 책 정보가 없거나 ID가 없는 경우
        console.log('책 정보 불완전: 사용자 정보 null 설정');
        response.userRating = null;
        response.userReadingStatus = null;
      }

      console.log('최종 응답:', {
        id: response.id,
        title: response.title,
        isbn: response.isbn,
        readingStats: response.readingStats ? '있음' : '없음',
        userRating: response.userRating
          ? `평점: ${response.userRating.rating}`
          : '없음',
        userReadingStatus: response.userReadingStatus || '없음',
      });

      return response;
    } catch (error) {
      console.error('처리 중 오류 발생:', error);
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
