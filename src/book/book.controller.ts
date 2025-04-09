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
} from '@nestjs/common';
import { BookService } from './book.service';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';

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
}
