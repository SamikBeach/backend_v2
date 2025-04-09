import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { BookService } from './book.service';
import { Book } from './entities/book.entity';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }

  @Get('featured')
  async findFeaturedBooks() {
    return this.bookService.findFeaturedBooks();
  }

  @Get('category/:categoryId')
  async findByCategoryId(
    @Param('categoryId') categoryId: string,
  ): Promise<Book[]> {
    return this.bookService.findByCategoryId(categoryId);
  }

  @Get('subcategory/:subcategoryId')
  async findBySubcategoryId(
    @Param('subcategoryId') subcategoryId: string,
  ): Promise<Book[]> {
    return this.bookService.findBySubcategoryId(subcategoryId);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.bookService.findById(id);
  }

  @Get('isbn/:isbn')
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
  @UseGuards(JwtAuthGuard)
  async create(@Body() createBookDto: CreateBookDto): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    return this.bookService.update(id, updateBookDto);
  }

  @Post('initialize-featured')
  @UseGuards(JwtAuthGuard)
  async initializeFeaturedBooks(
    @Query('categoryId') categoryId?: string,
    @Query('count') count?: number,
  ) {
    if (categoryId) {
      // 특정 카테고리의 인기 도서 초기화
      return this.bookService.initializeFeaturedBooksByCategory(
        categoryId,
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
            category,
            count || 10,
          );
      }

      return result;
    }
  }
}
