import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { BookService } from '../book/book.service';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { SearchTarget, SortType, CoverSize } from '../book/dto/search-book.dto';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly bookService: BookService,
  ) {}

  /**
   * 통합 검색 API
   */
  @Get()
  @OptionalAuth()
  async search(
    @Query('query') query: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('searchTarget') searchTarget?: string,
    @Query('categoryId') categoryId?: number,
    @Query('cover') cover?: string,
    @Query('outOfStockFilter') outOfStockFilter?: boolean,
    @Query('recentPublishFilter') recentPublishFilter?: number,
    @GetUser() user?: User,
  ): Promise<any> {
    if (!query) {
      return {
        books: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
    }

    // 검색 매개변수 객체 구성
    const searchParams = {
      sort: sort as SortType,
      searchTarget: searchTarget as SearchTarget,
      categoryId,
      cover: cover as CoverSize,
      outOfStockFilter,
      recentPublishFilter,
    };

    // 검색 결과 조회
    const searchResults = await this.bookService.searchBooks(
      query,
      type || 'Keyword',
      page || 1,
      limit || 10,
      searchParams,
    );

    // 검색 결과만 반환
    return searchResults;
  }

  /**
   * 검색 결과에서 책 선택 시 저장 API
   * 사용자가 검색 결과에서 특정 책을 선택했을 때 해당 정보를 기록합니다.
   * 이 정보는 Book 테이블에 저장되지 않고, 검색 로그 및 최근 검색어에 직접 저장됩니다.
   */
  @Post('log-book-selection')
  @OptionalAuth()
  async logBookSelection(
    @Body('term') term: string,
    @Body('bookId') bookId: number,
    @Body('title') title: string,
    @Body('author') author: string,
    @Body('coverImage') coverImage?: string,
    @Body('publisher') publisher?: string,
    @Body('isbn') isbn?: string,
    @Body('isbn13') isbn13?: string,
    @Body('description') description?: string,
    @GetUser() user?: User,
  ): Promise<any> {
    if (!term || !title || !author) {
      return { success: false, message: '필수 정보가 누락되었습니다.' };
    }

    const userId = user?.id;

    await this.searchService.saveSearchTerm(term, userId, {
      bookId,
      title,
      author,
      coverImage,
      publisher,
      isbn,
      isbn13,
      description: description ? description.substring(0, 500) : undefined, // 설명이 너무 길면 잘라내기
    });

    return { success: true, message: '검색 선택 정보가 저장되었습니다.' };
  }

  /**
   * 인기 검색어 API
   */
  @Get('popular')
  @IsPublic()
  async getPopularSearchTerms(@Query('limit') limit?: number): Promise<any> {
    return this.searchService.getPopularSearchTerms(limit || 10);
  }

  /**
   * 최근 검색어 API
   */
  @Get('recent')
  @UseGuards(JwtAuthGuard)
  async getRecentSearchTerms(
    @GetUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<any> {
    const recentSearches = await this.searchService.getRecentSearchTerms(
      user.id,
      limit || 5,
    );

    return {
      recentSearches,
      count: recentSearches.length,
    };
  }

  /**
   * 최근 검색어 삭제 API
   */
  @Delete('recent')
  @UseGuards(JwtAuthGuard)
  async deleteAllRecentSearches(@GetUser() user: User): Promise<any> {
    await this.searchService.deleteAllRecentSearchesByUserId(user.id);
    return { success: true, message: '모든 최근 검색어가 삭제되었습니다.' };
  }

  /**
   * 특정 검색어 삭제 API
   */
  @Delete('recent/:id')
  @UseGuards(JwtAuthGuard)
  async deleteRecentSearch(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<any> {
    const searchId = parseInt(id, 10);
    if (isNaN(searchId)) {
      return { success: false, message: '유효하지 않은 ID입니다.' };
    }

    await this.searchService.deleteRecentSearchById(user.id, searchId);
    return { success: true, message: '검색어가 삭제되었습니다.' };
  }

  /**
   * 인기 검색어 집계 관리자 API
   */
  @Post('aggregate')
  async aggregatePopularSearchTerms(): Promise<any> {
    await this.searchService.aggregatePopularSearchTerms();
    return { success: true };
  }

  /**
   * 검색 로그 정리 관리자 API
   */
  @Post('cleanup')
  async cleanupSearchLogs(@Query('days') days?: number): Promise<any> {
    await this.searchService.cleanupOldSearchLogs(days || 30);
    return { success: true };
  }

  /**
   * 베스트셀러 도서 API
   */
  @Get('bestsellers')
  @IsPublic()
  async getBestsellers(
    @Query('categoryId') categoryId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.bookService.findBestsellers(categoryId, page || 1, limit || 10);
  }

  /**
   * 신간 도서 API
   */
  @Get('new-releases')
  @IsPublic()
  async getNewReleases(
    @Query('categoryId') categoryId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.bookService.findNewBooks(categoryId, page || 1, limit || 10);
  }

  /**
   * ISBN으로 도서 상세 정보 조회 API
   */
  @Get('detail/:isbn')
  @IsPublic()
  async getBookDetail(@Param('isbn') isbn: string): Promise<any> {
    return this.bookService.getBookDetailByIsbn(isbn);
  }
}
