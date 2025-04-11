import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Delete,
  Redirect,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 통합 검색 API
   * 실제 검색은 BookController로 리다이렉트하여 처리
   */
  @Get()
  @IsPublic()
  @Redirect()
  async search(
    @Query('query') query: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser() user?: User,
  ): Promise<{ url: string }> {
    if (!query) {
      return { url: '/api/v2/books/search?query=' };
    }

    // 검색어 저장 (비동기로 처리)
    const userId = user?.id;
    this.searchService.saveSearchTerm(query, userId);

    // 검색 결과는 BookController로 리다이렉트
    return {
      url: `/api/v2/books/search?query=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}${page ? `&page=${page}` : ''}${limit ? `&limit=${limit}` : ''}`,
    };
  }

  /**
   * 검색 결과에서 책 선택 시 저장 API
   */
  @Post('log-book-selection')
  @IsPublic()
  async logBookSelection(
    @Body('term') term: string,
    @Body('bookId') bookId: number,
    @Body('title') title: string,
    @Body('author') author: string,
    @Body('coverImage') coverImage?: string,
    @Body('publisher') publisher?: string,
    @Body('description') description?: string,
    @GetUser() user?: User,
  ): Promise<any> {
    const userId = user?.id;

    await this.searchService.saveSearchTerm(term, userId, {
      bookId,
      title,
      author,
      coverImage,
      publisher,
      description,
    });

    return { success: true };
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
   * 검색어와 관련 책 정보 함께 반환
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
}
