import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { YouTubeService, YouTubeVideoResult } from './youtube.service';
import { BookService } from '../book/book.service';

@Controller('youtube')
export class YouTubeController {
  private readonly logger = new Logger(YouTubeController.name);

  constructor(
    private readonly youtubeService: YouTubeService,
    private readonly bookService: BookService,
  ) {}

  /**
   * 책 관련 YouTube 영상 조회
   *
   * @param {number} bookId - 책 ID (-1인 경우 ISBN 필요)
   * @param {number} [maxResults=5] - 최대 결과 수
   * @param {string} [isbn] - ISBN (bookId가 -1인 경우)
   * @returns {Promise<Object>} 책 정보와 YouTube 영상 목록
   */
  @Get('book/:bookId')
  @IsPublic()
  async findVideosByBookId(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('maxResults', new ParseIntPipe({ optional: true }))
    maxResults?: number,
    @Query('isbn') isbn?: string,
  ): Promise<{
    book: any;
    data: YouTubeVideoResult[];
    meta: {
      total: number;
      maxResults: number;
    };
  }> {
    try {
      this.logger.log(
        `YouTube 영상 검색 요청: bookId=${bookId}, maxResults=${maxResults}, isbn=${isbn}`,
      );

      let book = null;

      // bookId가 -1이고 ISBN이 제공된 경우, ISBN으로 책을 찾음
      if (bookId === -1 && isbn) {
        this.logger.log(`ISBN으로 책 조회: ${isbn}`);
        try {
          // ISBN으로 책 조회 (saveToDb=false로 설정하여 DB에 저장하지 않음)
          book = await this.bookService.getBookDetailByIsbn(isbn, false);
          this.logger.log(`ISBN으로 찾은 책:`, {
            id: book?.id,
            title: book?.title,
            author: book?.author,
          });

          if (!book) {
            throw new NotFoundException(
              `ISBN ${isbn}으로 도서를 찾을 수 없습니다.`,
            );
          }

          // DB에 이미 존재하는 책인 경우에만 실제 bookId로 검색 진행
          if (book && book.id > 0) {
            bookId = book.id;
            this.logger.log(`실제 bookId로 변경: ${bookId}`);
          }
        } catch (error) {
          this.logger.error(`ISBN 조회 실패: ${error.message}`);
          throw new NotFoundException(
            `ISBN ${isbn}으로 도서를 찾을 수 없습니다.`,
          );
        }
      } else {
        // 일반적인 경우: bookId로 책 정보 조회
        this.logger.log(`bookId로 책 조회: ${bookId}`);
        book = await this.bookService.findById(bookId);
        this.logger.log(`bookId로 찾은 책:`, {
          id: book?.id,
          title: book?.title,
          author: book?.author,
          publisher: book?.publisher,
        });

        if (!book) {
          throw new NotFoundException(
            `ID ${bookId}로 도서를 찾을 수 없습니다.`,
          );
        }
      }

      // YouTube에서 책 관련 영상 검색
      this.logger.log(`YouTube 검색 시작:`, {
        bookTitle: book.title,
        authorName: book.author,
        publisher: book.publisher,
        maxResults: maxResults || 5,
      });

      const videos = await this.youtubeService.searchBookVideos({
        bookTitle: book.title,
        authorName: book.author,
        publisher: book.publisher,
        maxResults: maxResults || 5,
      });

      this.logger.log(`YouTube 검색 결과: ${videos.length}개 영상 발견`);

      return {
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverImage: book.coverImage,
          isbn: book.isbn,
          isbn13: book.isbn13,
        },
        data: videos,
        meta: {
          total: videos.length,
          maxResults: maxResults || 5,
        },
      };
    } catch (error) {
      this.logger.error(`YouTube 영상 조회 오류:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'YouTube 영상 조회 중 오류가 발생했습니다.',
      );
    }
  }
}
