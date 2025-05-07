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
  BookSearchResponse,
  BookSearchResponseDto,
} from './dto/book.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { RatingService } from '../rating/rating.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  PopularBooksSortOptions,
  TimeRangeOptions,
} from './dto/popular-books.dto';

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

  @Get('isbn/:isbn')
  @IsPublic()
  async findByIsbn(
    @Param('isbn') isbn: string,
    @GetUser() user?: User,
  ): Promise<BookResponse> {
    try {
      // getBookDetailByIsbn 메서드는 DB에 없으면 알라딘에서 가져와 동일한 Book 형식으로 반환합니다.
      // 명시적으로 saveToDb=false를 설정하여 검색 시에는 DB에 저장하지 않습니다.
      const book = await this.bookService.getBookDetailByIsbn(isbn, false);

      // 서비스 메서드를 사용하여 책 정보를 사용자별 데이터와 통합
      return await this.bookService.enrichBookWithUserData(book, user?.id);
    } catch (error) {
      console.error(`ISBN ${isbn} 조회 중 오류 발생:`, error);
      throw new NotFoundException(`ISBN ${isbn}으로 도서를 찾을 수 없습니다.`);
    }
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

  // 통합 인기 도서 API
  @Get('popular')
  @IsPublic()
  @ApiOperation({
    summary: '인기 도서 조회 (무한 스크롤 지원)',
    description:
      '카테고리와 서브카테고리 필터, 정렬, 기간 필터를 지원하는 인기 도서 조회 API',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: '카테고리 ID (필터링)',
  })
  @ApiQuery({
    name: 'subcategoryId',
    required: false,
    description: '서브카테고리 ID (필터링)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: PopularBooksSortOptions,
    description: '정렬 방식 (별점순, 리뷰순, 서재순, 출판일순)',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: TimeRangeOptions,
    description: '기간 필터 (전체, 오늘, 이번 주, 이번 달, 올해)',
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 결과 수' })
  @ApiResponse({
    status: 200,
    description: '인기 도서 목록 및 페이지네이션 정보',
    type: BookSearchResponseDto,
  })
  async findPopularBooks(
    @Query('categoryId', new ParseIntPipe({ optional: true }))
    categoryId?: number,
    @Query('subcategoryId', new ParseIntPipe({ optional: true }))
    subcategoryId?: number,
    @Query('sort') sort: string = 'rating-desc',
    @Query('timeRange') timeRange: string = 'all',
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @GetUser() user?: User,
  ): Promise<BookSearchResponse> {
    return this.bookService.findPopularBooks(
      categoryId,
      subcategoryId,
      sort,
      timeRange,
      page || 1,
      limit || 20,
      user?.id,
    );
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

  @Get('discover')
  @IsPublic()
  @ApiOperation({
    summary: '오늘의 발견 도서 조회 (무한 스크롤 지원)',
    description:
      '발견하기 카테고리와 서브카테고리 필터, 정렬, 기간 필터를 지원하는 도서 조회 API',
  })
  @ApiQuery({
    name: 'discoverCategoryId',
    required: false,
    description: '발견하기 카테고리 ID (필터링)',
  })
  @ApiQuery({
    name: 'discoverSubCategoryId',
    required: false,
    description: '발견하기 서브카테고리 ID (필터링)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: PopularBooksSortOptions,
    description: '정렬 방식 (별점순, 리뷰순, 서재순, 출판일순)',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    enum: TimeRangeOptions,
    description: '기간 필터 (전체, 오늘, 이번 주, 이번 달, 올해)',
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 결과 수' })
  @ApiResponse({
    status: 200,
    description: '발견하기 도서 목록 및 페이지네이션 정보',
    type: BookSearchResponseDto,
  })
  async findDiscoverBooks(
    @Query('discoverCategoryId', new ParseIntPipe({ optional: true }))
    discoverCategoryId?: number,
    @Query('discoverSubCategoryId', new ParseIntPipe({ optional: true }))
    discoverSubCategoryId?: number,
    @Query('sort') sort: string = 'rating-desc',
    @Query('timeRange') timeRange: string = 'all',
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @GetUser() user?: User,
  ): Promise<BookSearchResponse> {
    return this.bookService.findDiscoverBooks(
      discoverCategoryId,
      discoverSubCategoryId,
      sort,
      timeRange,
      page || 1,
      limit || 20,
      user?.id,
    );
  }

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
    @Query('discoverSubCategoryId', new ParseIntPipe({ optional: true }))
    discoverSubCategoryId?: number,
    @Query('sort') sort?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<Book[]> {
    return this.bookService.findByDiscoverCategoryId(
      discoverCategoryId,
      discoverSubCategoryId,
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

  @Get(':id')
  @IsPublic()
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: User,
  ): Promise<BookResponse> {
    try {
      // 기본 책 정보 조회
      const book = await this.bookService.findById(id);

      // 서비스 메서드를 사용하여 책 정보를 사용자별 데이터와 통합
      return await this.bookService.enrichBookWithUserData(book, user?.id);
    } catch (error) {
      console.error(`BookID ${id} 조회 중 오류 발생:`, error);
      throw new NotFoundException(`ID ${id}로 도서를 찾을 수 없습니다.`);
    }
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.remove(id);
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
}
