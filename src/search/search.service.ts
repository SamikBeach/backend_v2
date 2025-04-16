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
    private readonly readingStatusService: ReadingStatusService,
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
   * @param limit 조회 개수
   * @returns 최근 검색어 목록 (책 정보 포함)
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
    console.log({ recentSearches });

    // 각 검색어에 대해 책 정보가 있으면 추가 정보 조회
    const enhancedSearches = await Promise.all(
      recentSearches.map(async (item) => {
        // 최근 검색어 관련 정보 임시 저장
        const recentSearchId = item.id;
        console.log({ recentSearchId });

        const bookResponse: BookResponse = {
          id: recentSearchId,
          bookId: item.bookId || -1, // 명시적으로 bookId 필드 추가
          title: item.title || '',
          author: item.author || '',
          coverImage: item.coverImage || '',
          publisher: item.publisher || '',
          isbn: item.isbn || '',
          isbn13: item.isbn13 || '',
          description: item.description || '',
          // 기타 Book 엔티티에 필요한 필드 초기화
          category: null,
          subcategory: null,
          discoverCategory: null,
          discoverSubCategory: null,
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
          // 날짜 필드
          createdAt: item.createdAt,
          updatedAt: item.createdAt, // 최근 검색에서는 createdAt과 동일하게 설정
        };

        // bookId가 있고 DB에 실제로 저장된 책이면(id > 0) 추가 정보 조회
        if (item.bookId && item.bookId > 0) {
          try {
            // 1. 읽기 상태 통계 정보 가져오기
            const readingStats =
              await this.readingStatusService.getBookReadingStats(
                item.bookId,
                userId,
              );

            if (readingStats) {
              bookResponse.readingStats = {
                currentReaders: readingStats.currentReaders,
                completedReaders: readingStats.completedReaders,
                averageReadingTime: readingStats.averageReadingTime,
                difficulty: readingStats.difficulty,
                readingStatusCounts: readingStats.readingStatusCounts,
              };

              // 사용자의 읽기 상태가 있으면 포함
              if (readingStats.userReadingStatus) {
                bookResponse.userReadingStatus = readingStats.userReadingStatus;
              }
            }
          } catch (error) {
            this.logger.error(`읽기 상태 조회 오류: ${error.message}`);
            // 오류가 발생해도 계속 진행
          }

          // 2. 사용자 평점 정보 가져오기
          try {
            const userRating = await this.ratingService.findByUserAndBook(
              userId,
              item.bookId,
            );

            if (userRating) {
              bookResponse.userRating = userRating;
            }
          } catch (error) {
            this.logger.error(`평점 조회 오류: ${error.message}`);
            // 오류가 발생해도 계속 진행
          }

          // 3. 실제 DB에 있는 책 정보 가져오기
          try {
            const bookInfo = await this.bookService.findById(item.bookId);
            if (bookInfo) {
              // 실제 책 정보로 업데이트 (평점, 리뷰 수 등)
              bookResponse.rating = bookInfo.rating;
              bookResponse.reviews = bookInfo.reviews;
              bookResponse.totalRatings = bookInfo.totalRatings;
              bookResponse.category = bookInfo.category;
              bookResponse.subcategory = bookInfo.subcategory;
              // 기타 필요한 필드 업데이트
            }
          } catch (error) {
            this.logger.error(`책 정보 조회 오류: ${error.message}`);
            // 오류가 발생해도 계속 진행
          }
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
