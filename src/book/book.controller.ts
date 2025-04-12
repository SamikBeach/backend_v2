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
  UseGuards,
} from '@nestjs/common';
import { BookService } from './book.service';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { SearchTarget, SortType, CoverSize } from './dto/search-book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

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
  async findByIsbn(@Param('isbn') isbn: string): Promise<Book> {
    const book = await this.bookService.findByIsbn(isbn);
    if (book) {
      return book;
    }

    // 도서가 DB에 없는 경우 알라딘 API에서 가져옴
    const aladinBook = await this.bookService.fetchBookDetailsFromAladin(isbn);
    return aladinBook;
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
