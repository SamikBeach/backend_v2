import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PopularSearch, RecentSearch, SearchLog } from './search.entity';
import { BookService } from '../book/book.service';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { RatingService } from '../rating/rating.service';
import { BookResponse } from '../book/dto/book.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly RECENT_SEARCH_MAX_PER_USER = 20; // 사용자당 최대 최근 검색어 수

  constructor(
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(PopularSearch)
    private readonly popularSearchRepository: Repository<PopularSearch>,
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
    @Inject(forwardRef(() => BookService))
    private readonly bookService: BookService,
    @Inject(forwardRef(() => ReadingStatusService))
    private readonly readingStatusService: ReadingStatusService,
    @Inject(forwardRef(() => RatingService))
    private readonly ratingService: RatingService,
  ) {}

  /**
   * 검색어 저장 (로그, 인기 검색어, 최근 검색어)
   * @param term 검색어
   * @param userId 사용자 ID (옵션)
   * @param bookInfo 선택된 책 정보 (옵션) - Book 테이블과 연관관계가 아니라 직접 정보를 저장
   */
  async saveSearchTerm(
    term: string,
    userId?: number,
    bookInfo?: {
      bookId: number; // 알라딘 API에서의 ID 값, Book 테이블에 없을 수 있음
      title: string;
      author: string;
      coverImage?: string;
      publisher?: string;
      isbn?: string;
      isbn13?: string;
      description?: string;
    },
  ): Promise<void> {
    try {
      // 공백 검색어는 저장하지 않음
      if (!term || term.trim() === '') {
        return;
      }

      // 검색어 로그 저장
      const searchLog = {
        term: term.trim(),
        userId,
      };

      // 책 정보가 있으면 추가
      if (bookInfo && bookInfo.title && bookInfo.author) {
        Object.assign(searchLog, {
          bookId: bookInfo.bookId, // 책의 식별자로만 사용, 외래키가 아님
          title: bookInfo.title.trim(),
          author: bookInfo.author.trim(),
          coverImage: bookInfo.coverImage,
          publisher: bookInfo.publisher ? bookInfo.publisher.trim() : undefined,
          isbn: bookInfo.isbn,
          isbn13: bookInfo.isbn13,
          description: bookInfo.description
            ? bookInfo.description.trim()
            : undefined,
        });
      }

      await this.searchLogRepository.save(searchLog);

      // 인기 검색어 업데이트
      await this.updatePopularSearchTerm(term);

      // 로그인한 사용자인 경우 최근 검색어에 추가
      if (userId) {
        await this.addRecentSearchTerm(term, userId, bookInfo);
      }
    } catch (error) {
      this.logger.error(`검색어 저장 오류: ${error.message}`);
    }
  }

  /**
   * 인기 검색어 업데이트
   */
  private async updatePopularSearchTerm(term: string): Promise<void> {
    const popularSearch = await this.popularSearchRepository.findOne({
      where: { term },
    });

    if (popularSearch) {
      // 기존 검색어의 카운트 증가
      popularSearch.count += 1;
      await this.popularSearchRepository.save(popularSearch);
    } else {
      // 새 검색어 추가
      await this.popularSearchRepository.save({
        term,
        count: 1,
      });
    }
  }

  /**
   * 사용자별 최근 검색어 추가
   * @param term 검색어
   * @param userId 사용자 ID
   * @param bookInfo 책 정보 (DB 저장된 책이 아니어도 직접 정보 저장)
   */
  private async addRecentSearchTerm(
    term: string,
    userId: number,
    bookInfo?: {
      bookId: number; // 알라딘 API의 ID, Book 테이블에 실제로 존재하지 않을 수 있음
      title: string;
      author: string;
      coverImage?: string;
      publisher?: string;
      isbn?: string;
      isbn13?: string;
      description?: string;
    },
  ): Promise<void> {
    // 이미 존재하는 동일 검색어가 있는지 확인
    const existingSearch = await this.recentSearchRepository.findOne({
      where: { userId, term: term.trim() },
    });

    if (existingSearch) {
      // 이미 있으면 삭제 후 새로 추가 (최신 날짜로 업데이트)
      await this.recentSearchRepository.remove(existingSearch);
    }

    // ISBN 기반 중복 체크 (같은 책을 다른 검색어로 검색한 경우도 처리)
    if (bookInfo && (bookInfo.isbn || bookInfo.isbn13)) {
      try {
        let existingBookSearch;

        if (bookInfo.isbn) {
          existingBookSearch = await this.recentSearchRepository.findOne({
            where: { userId, isbn: bookInfo.isbn },
          });
        }

        // ISBN으로 찾지 못했고 ISBN13이 있으면 ISBN13으로 검색
        if (!existingBookSearch && bookInfo.isbn13) {
          existingBookSearch = await this.recentSearchRepository.findOne({
            where: { userId, isbn13: bookInfo.isbn13 },
          });
        }

        // 이미 같은 ISBN의 책이 있으면 삭제
        if (
          existingBookSearch &&
          existingBookSearch.id !== existingSearch?.id
        ) {
          this.logger.log(
            `중복 ISBN(${bookInfo.isbn || bookInfo.isbn13}) 검색어 제거: "${existingBookSearch.term}" → "${term}" (userId: ${userId})`,
          );
          await this.recentSearchRepository.remove(existingBookSearch);
        }
      } catch (error) {
        this.logger.error(`ISBN 중복 검색어 제거 중 오류: ${error.message}`);
        // 오류가 발생해도 계속 진행
      }
    }

    // 최근 검색어 추가를 위한 기본 객체
    const recentSearch = {
      userId,
      term: term.trim(),
    };

    // 책 정보가 있으면 추가
    if (bookInfo && bookInfo.title && bookInfo.author) {
      Object.assign(recentSearch, {
        bookId: bookInfo.bookId, // 외래키가 아닌 식별자로 사용
        title: bookInfo.title.trim(),
        author: bookInfo.author.trim(),
        coverImage: bookInfo.coverImage,
        publisher: bookInfo.publisher ? bookInfo.publisher.trim() : undefined,
        isbn: bookInfo.isbn,
        isbn13: bookInfo.isbn13,
        description: bookInfo.description
          ? bookInfo.description.trim()
          : undefined,
      });
    }

    // 최근 검색어 저장
    await this.recentSearchRepository.save(recentSearch);

    // 사용자별 최대 검색어 수 제한 (오래된 것부터 삭제)
    const recentSearchCount = await this.recentSearchRepository.count({
      where: { userId },
    });

    if (recentSearchCount > this.RECENT_SEARCH_MAX_PER_USER) {
      const excessCount = recentSearchCount - this.RECENT_SEARCH_MAX_PER_USER;

      // 오래된 검색어 조회
      const oldestSearches = await this.recentSearchRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
        take: excessCount,
      });

      // 오래된 검색어 삭제
      if (oldestSearches.length > 0) {
        await this.recentSearchRepository.remove(oldestSearches);
      }
    }
  }

  /**
   * 인기 검색어 조회
   */
  async getPopularSearchTerms(
    limit: number = 10,
  ): Promise<{ id: number; term: string; count: number }[]> {
    const popularSearches = await this.popularSearchRepository.find({
      order: { count: 'DESC' },
      take: limit,
    });

    return popularSearches.map((item) => ({
      id: item.id,
      term: item.term,
      count: item.count,
    }));
  }

  /**
   * 최근 검색어 조회
   * @param userId 사용자 ID
   * @param limit 결과 수
   */
  async getRecentSearchTerms(
    userId: number,
    limit: number = 5,
  ): Promise<BookResponse[]> {
    if (!userId) {
      return [];
    }

    const recentSearches = await this.recentSearchRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // 각 검색어에 대해 책 정보가 있으면 추가 정보 조회
    const enhancedSearches = await Promise.all(
      recentSearches.map(async (item) => {
        // 최근 검색어 관련 기본 정보 구성
        const bookResponse: BookResponse = {
          id: item.id, // 최근 검색의 ID를 id로 사용
          bookId: item.bookId || -1,
          title: item.title || item.term, // 책 제목이 없으면 검색어를 사용
          author: item.author || '',
          coverImage: item.coverImage || '',
          publisher: item.publisher || '',
          isbn: item.isbn || '',
          isbn13: item.isbn13 || '',
          description: item.description || '',
          // 기본값 설정
          category: null,
          subcategory: null,
          discoverCategory: null,
          discoverSubCategory: null,
          discoverCategoryId: null,
          discoverSubCategoryId: null,
          rating: 0,
          reviews: 0,
          totalRatings: 0,
          publishDate: null,
          translator: '',
          pageCount: 0,
          tags: [],
          priceSales: 0,
          priceStandard: 0,
          isFeatured: false,
          isDiscovered: false,
          readingStatuses: [],
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
          // 검색 관련 메타데이터 추가
          searchTerm: item.term, // 실제 검색에 사용된 검색어
          searchedAt: item.createdAt, // 검색 시간
        };

        // 책 정보 조회 (DB에 저장된 책 확인)
        let bookInfo = null;

        // 방법 1: bookId로 직접 조회
        if (item.bookId && item.bookId > 0) {
          try {
            bookInfo = await this.bookService.findById(item.bookId);
            this.logger.log(`책 ID로 조회 성공: ${item.bookId}`);
          } catch (error) {
            this.logger.warn(
              `책 ID ${item.bookId} 조회 실패: ${error.message}`,
            );
          }
        }

        // 방법 2: ISBN 또는 ISBN13으로 조회 (bookId로 조회 실패 시)
        if (!bookInfo && (item.isbn || item.isbn13)) {
          try {
            const isbnToUse = item.isbn13 || item.isbn;
            if (isbnToUse) {
              this.logger.log(`ISBN(${isbnToUse})으로 책 정보 조회 시도`);
              bookInfo = await this.bookService.findByIsbn(isbnToUse);
            }
          } catch (error) {
            this.logger.warn(`ISBN 조회 실패: ${error.message}`);
          }
        }

        // 책 정보가 조회되면 BookService의 enrichBookWithUserData 사용하여 사용자 데이터 결합
        if (bookInfo) {
          // 기본 책 정보 업데이트
          Object.assign(bookResponse, {
            bookId: bookInfo.id > 0 ? bookInfo.id : bookResponse.bookId,
            title: bookInfo.title,
            author: bookInfo.author,
            translator: bookInfo.translator,
            coverImage: bookInfo.coverImage,
            publisher: bookInfo.publisher,
            publishDate: bookInfo.publishDate,
            description: bookInfo.description,
            isbn: bookInfo.isbn,
            isbn13: bookInfo.isbn13,
            rating: bookInfo.rating,
            reviews: bookInfo.reviews,
            totalRatings: bookInfo.totalRatings,
            pageCount: bookInfo.pageCount,
            tags: bookInfo.tags,
            priceSales: bookInfo.priceSales,
            priceStandard: bookInfo.priceStandard,
            category: bookInfo.category,
            subcategory: bookInfo.subcategory,
            isFeatured: bookInfo.isFeatured,
            isDiscovered: bookInfo.isDiscovered,
          });

          // 실제 DB에 저장된 책인 경우, enrichBookWithUserData 활용하여 사용자 데이터 결합
          if (bookInfo.id > 0) {
            try {
              const enrichedBook =
                await this.bookService.enrichBookWithUserData(bookInfo, userId);

              // 사용자별 데이터(읽기 상태, 평점) 업데이트
              bookResponse.readingStats = enrichedBook.readingStats;
              bookResponse.userRating = enrichedBook.userRating;
              bookResponse.userReadingStatus = enrichedBook.userReadingStatus;
            } catch (error) {
              this.logger.error(`책 정보 보강 중 오류 발생: ${error.message}`);
              // 오류가 발생해도 계속 진행
            }
          }
        } else {
          this.logger.log(
            `책 정보를 찾을 수 없음: ${item.term} (ID: ${item.bookId || 'null'}, ISBN: ${item.isbn || item.isbn13 || 'null'})`,
          );
        }

        return bookResponse;
      }),
    );

    return enhancedSearches;
  }

  /**
   * 인기 검색어 집계 (배치 작업)
   * 스케줄러 등에서 주기적으로 호출할 함수
   */
  async aggregatePopularSearchTerms(): Promise<void> {
    this.logger.log('인기 검색어 집계 시작');

    try {
      // 집계 기간 설정 (최근 24시간)
      const aggregationPeriod = new Date();
      aggregationPeriod.setHours(aggregationPeriod.getHours() - 24);

      // 기간 내 검색어 집계
      const searchStats = await this.searchLogRepository
        .createQueryBuilder('log')
        .select('log.term, COUNT(*) as count')
        .where('log.createdAt > :period', { period: aggregationPeriod })
        .groupBy('log.term')
        .orderBy('count', 'DESC')
        .getRawMany();

      // 인기 검색어 테이블 업데이트
      for (const stat of searchStats) {
        const { term, count } = stat;

        const popularSearch = await this.popularSearchRepository.findOne({
          where: { term },
        });

        if (popularSearch) {
          // 기존 데이터 업데이트
          popularSearch.count = count;
          await this.popularSearchRepository.save(popularSearch);
        } else {
          // 새 데이터 추가
          await this.popularSearchRepository.save({
            term,
            count,
          });
        }
      }

      this.logger.log(`인기 검색어 집계 완료 (${searchStats.length}개 처리)`);
    } catch (error) {
      this.logger.error(`인기 검색어 집계 오류: ${error.message}`);
    }
  }

  /**
   * 오래된 검색 로그 삭제 (배치 작업)
   */
  async cleanupOldSearchLogs(days: number = 30): Promise<void> {
    this.logger.log(`${days}일 이상 된 검색 로그 삭제 시작`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deleteResult = await this.searchLogRepository.delete({
        createdAt: LessThan(cutoffDate),
      });

      this.logger.log(`검색 로그 삭제 완료 (${deleteResult.affected}개 삭제)`);
    } catch (error) {
      this.logger.error(`검색 로그 삭제 오류: ${error.message}`);
    }
  }

  /**
   * 사용자의 모든 최근 검색어 삭제
   */
  async deleteAllRecentSearchesByUserId(userId: number): Promise<void> {
    if (!userId) return;

    try {
      await this.recentSearchRepository.delete({ userId });
      this.logger.log(`사용자 ID ${userId}의 모든 최근 검색어 삭제 완료`);
    } catch (error) {
      this.logger.error(`최근 검색어 삭제 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 사용자의 특정 검색어 삭제
   * @param userId 사용자 ID
   * @param searchId 삭제할 검색어 ID
   */
  async deleteRecentSearchById(
    userId: number,
    searchId: number,
  ): Promise<void> {
    if (!userId || !searchId) return;

    try {
      // 해당 ID의 검색어가 사용자의 것인지 확인
      const search = await this.recentSearchRepository.findOne({
        where: { id: searchId, userId },
      });

      if (!search) {
        throw new Error(
          '검색어를 찾을 수 없거나 해당 사용자의 검색어가 아닙니다.',
        );
      }

      // 검색어 삭제
      await this.recentSearchRepository.delete(searchId);
      this.logger.log(`사용자 ID ${userId}의 검색어 ID ${searchId} 삭제 완료`);
    } catch (error) {
      this.logger.error(`검색어 삭제 오류: ${error.message}`);
      throw error;
    }
  }
}
