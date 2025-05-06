import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatisticsSetting } from '../entities/user-statistics-setting.entity';
import { ReadingStatus } from '../../reading-status/entities/reading-status.entity';
import { Book } from '../../book/entities/book.entity';
import { Category } from '../../category/entities/category.entity';
import { SubCategory } from '../../category/entities/subcategory.entity';
import {
  ReadingStatusStatsResponseDto,
  ReadingStatusByPeriodResponseDto,
  GenreAnalysisResponseDto,
  AuthorPublisherStatsResponseDto,
} from '../dto/reading-status-statistics.dto';
import { ReadingStatusType } from '../../reading-status/entities/reading-status.entity';
import { In } from 'typeorm';

@Injectable()
export class ReadingStatusStatisticsService {
  private readonly logger = new Logger(ReadingStatusStatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(ReadingStatus)
    private readonly readingStatusRepository: Repository<ReadingStatus>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  async getOrCreateUserStatisticsSetting(
    userId: number,
  ): Promise<UserStatisticsSetting> {
    // 사용자 통계 설정 조회
    let setting = await this.userStatisticsSettingRepository.findOne({
      where: { userId },
    });

    // 설정이 없으면 기본값으로 생성
    if (!setting) {
      setting = this.userStatisticsSettingRepository.create({
        userId,
        // 기본값은 모두 비공개
        isReadingStatusPublic: false,
        isReadingStatusByPeriodPublic: false,
        isGenreAnalysisPublic: false,
        isAuthorPublisherStatsPublic: false,
        isReviewStatsPublic: false,
        isRatingStatsPublic: false,
        isActivityFrequencyPublic: false,
        isRatingHabitsPublic: false,
        isUserInteractionPublic: false,
        isFollowerStatsPublic: false,
        isCommunityActivityPublic: false,
        isReviewInfluencePublic: false,
        isLibraryCompositionPublic: false,
        isLibraryPopularityPublic: false,
        isLibraryUpdatePatternPublic: false,
        isSearchActivityPublic: false,
      });

      await this.userStatisticsSettingRepository.save(setting);
    }

    return setting;
  }

  // 독서 상태별 도서 수 통계
  async getReadingStatusStats(
    userId: number,
    requestUserId?: number,
  ): Promise<ReadingStatusStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReadingStatusPublic) {
          return {
            wantToReadCount: 0,
            readingCount: 0,
            readCount: 0,
            completionRate: 0,
            isPublic: false,
          };
        }
      }

      // 읽고 싶은 책 수
      const wantToReadCount = await this.readingStatusRepository.count({
        where: {
          userId,
          status: ReadingStatusType.WANT_TO_READ,
        },
      });

      // 읽는 중인 책 수
      const readingCount = await this.readingStatusRepository.count({
        where: {
          userId,
          status: ReadingStatusType.READING,
        },
      });

      // 읽은 책 수
      const readCount = await this.readingStatusRepository.count({
        where: {
          userId,
          status: ReadingStatusType.READ,
        },
      });

      // 완독률 계산 - 읽기 시작한 책 중 완독한 책의 비율
      const totalStarted = readingCount + readCount;
      const completionRate =
        totalStarted > 0 ? (readCount / totalStarted) * 100 : 0;

      return {
        wantToReadCount,
        readingCount,
        readCount,
        completionRate,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`독서 상태 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 헬퍼 메서드: 비어있는 연도별 장르 데이터 생성
  private generateEmptyYearlyGenreData(count = 5): {
    year: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

    for (let i = 0; i < count; i++) {
      const year = currentYear - count + i + 1;
      result.push({
        year: year.toString(),
        categories: [{ category: '미분류', count: 0 }],
        subCategories: [{ subCategory: '미분류', count: 0 }],
      });
    }

    return result;
  }

  // 헬퍼 메서드: 비어있는 월별 장르 데이터 생성
  private generateEmptyMonthlyGenreData(count = 5): {
    month: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[] {
    const result = [];
    const today = new Date();

    // 항상 현재 월부터 과거 count-1개월을 생성
    for (let i = 0; i < count; i++) {
      const targetDate = new Date(today);
      // count-1-i이 역순으로 과거 월을 생성함 (예: 4,3,2,1,0)
      targetDate.setMonth(today.getMonth() - (count - 1 - i));

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');

      result.push({
        month: `${year}-${month}`,
        categories: [{ category: '미분류', count: 0 }],
        subCategories: [{ subCategory: '미분류', count: 0 }],
      });
    }

    return result;
  }

  // 헬퍼 메서드: 비어있는 주간별 장르 데이터 생성
  private generateEmptyWeeklyGenreData(): {
    week: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);

      const endMonth = endDate.getMonth() + 1;
      const weekIndex = Math.ceil(endDate.getDate() / 7);

      result.push({
        week: `${endMonth}월 ${weekIndex}째주`,
        categories: [{ category: '미분류', count: 0 }],
        subCategories: [{ subCategory: '미분류', count: 0 }],
      });
    }

    // 가장 오래된 주부터 표시하기 위해 역순으로 반환
    return result.reverse().slice(0, 5); // 항상 5개만 반환
  }

  // 헬퍼 메서드: 비어있는 일별 장르 데이터 생성
  private generateEmptyDailyGenreData(): {
    date: string;
    categories: { category: string; count: number }[];
    subCategories: { subCategory: string; count: number }[];
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 4; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      result.push({
        date: this.formatDate(date),
        categories: [{ category: '미분류', count: 0 }],
        subCategories: [{ subCategory: '미분류', count: 0 }],
      });
    }

    // 항상 5개 반환
    return result;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 장르 분석 통계 개선
  async getGenreAnalysis(
    userId: number,
    requestUserId?: number,
  ): Promise<GenreAnalysisResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isGenreAnalysisPublic) {
          return {
            categoryCounts: [],
            subCategoryCounts: [],
            mostReadCategory: '데이터 없음',
            yearly: this.generateEmptyYearlyGenreData(),
            monthly: this.generateEmptyMonthlyGenreData(),
            weekly: this.generateEmptyWeeklyGenreData(),
            daily: this.generateEmptyDailyGenreData(),
            isPublic: false,
          };
        }
      }

      // 사용자가 읽은 책의 총 개수 구하기
      const totalReadBooks = await this.readingStatusRepository.count({
        where: {
          userId,
          status: ReadingStatusType.READ,
        },
      });

      this.logger.log(`사용자 ${userId}의 읽은 책 개수: ${totalReadBooks}`);

      // 기본값 설정
      let categoryCounts = [];
      let subCategoryCounts = [];
      let mostReadCategory = '데이터 없음';
      let yearly = this.generateEmptyYearlyGenreData();
      let monthly = this.generateEmptyMonthlyGenreData();
      let weekly = this.generateEmptyWeeklyGenreData();
      let daily = this.generateEmptyDailyGenreData();

      if (totalReadBooks > 0) {
        // 읽은 책 ID 목록 조회
        const readStatusResult = await this.readingStatusRepository
          .createQueryBuilder('status')
          .select('status.bookId', 'bookId')
          .where('status.userId = :userId', { userId })
          .andWhere('status.status = :status', {
            status: ReadingStatusType.READ,
          })
          .getRawMany();

        const bookIds = readStatusResult.map((status) => status.bookId);

        if (bookIds.length > 0) {
          this.logger.log(
            `사용자 ${userId}가 읽은 책 ID 목록: ${bookIds.join(', ')}`,
          );

          // 카테고리와 서브카테고리 조회를 위한 개선된 쿼리
          const booksWithCategories = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoinAndSelect('book.category', 'category')
            .leftJoinAndSelect('book.subcategory', 'subcategory')
            .where('book.id IN (:...bookIds)', { bookIds })
            .getMany();

          this.logger.log(
            `조회된 책 데이터 (첫 3개): ${JSON.stringify(
              booksWithCategories.slice(0, 3).map((book) => ({
                id: book.id,
                title: book.title,
                category: book.category?.name,
                subcategory: book.subcategory?.name,
              })),
            )}`,
          );

          // 카테고리와 서브카테고리 데이터 수집을 위한 맵
          const categoryMap = new Map<string, number>();
          const subCategoryMap = new Map<string, number>();

          // 데이터 집계
          for (const book of booksWithCategories) {
            if (book.category) {
              const categoryName = book.category.name;
              categoryMap.set(
                categoryName,
                (categoryMap.get(categoryName) || 0) + 1,
              );
            } else {
              // 카테고리가 없는 경우 '미분류'로 처리
              categoryMap.set('미분류', (categoryMap.get('미분류') || 0) + 1);
            }

            if (book.subcategory) {
              const subCategoryName = book.subcategory.name;
              subCategoryMap.set(
                subCategoryName,
                (subCategoryMap.get(subCategoryName) || 0) + 1,
              );
            } else {
              // 서브카테고리가 없는 경우 '미분류'로 처리
              subCategoryMap.set(
                '미분류',
                (subCategoryMap.get('미분류') || 0) + 1,
              );
            }
          }

          // 맵에서 배열로 변환
          categoryCounts = Array.from(categoryMap.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

          subCategoryCounts = Array.from(subCategoryMap.entries())
            .map(([subCategory, count]) => ({ subCategory, count }))
            .sort((a, b) => b.count - a.count);

          // 가장 많이 읽은 카테고리
          if (categoryCounts.length > 0) {
            mostReadCategory = categoryCounts[0].category;
          }

          // 연도별, 월별, 주별, 일별 데이터에 카테고리 정보 적용
          const topCategories = categoryCounts.slice(0, 3);
          const topSubCategories = subCategoryCounts.slice(0, 3);

          // 각 기간별 데이터에 실제 카테고리 정보 적용
          yearly = this.generateEmptyYearlyGenreData().map((item) => ({
            ...item,
            categories: topCategories,
            subCategories: topSubCategories,
          }));

          monthly = this.generateEmptyMonthlyGenreData().map((item) => ({
            ...item,
            categories: topCategories,
            subCategories: topSubCategories,
          }));

          weekly = this.generateEmptyWeeklyGenreData().map((item) => ({
            ...item,
            categories: topCategories,
            subCategories: topSubCategories,
          }));

          daily = this.generateEmptyDailyGenreData().map((item) => ({
            ...item,
            categories: topCategories,
            subCategories: topSubCategories,
          }));
        }
      }

      return {
        categoryCounts,
        subCategoryCounts,
        mostReadCategory,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`장르 분석 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getAuthorPublisherStats(
    userId: number,
    requestUserId?: number,
  ): Promise<AuthorPublisherStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isAuthorPublisherStatsPublic) {
          return {
            topAuthors: [],
            topPublishers: [],
            publishYearDistribution: [],
            isPublic: false,
          };
        }
      }

      // 먼저 사용자가 읽은 책이 있는지 확인
      const readCount = await this.readingStatusRepository.count({
        where: {
          userId,
          status: ReadingStatusType.READ,
        },
      });

      this.logger.log(`User ${userId} has ${readCount} books marked as READ`);

      // 읽은 책이 없는 경우 기본 데이터 반환
      if (readCount === 0) {
        return {
          topAuthors: [{ author: '아직 독서 기록이 없습니다', count: 0 }],
          topPublishers: [{ publisher: '아직 독서 기록이 없습니다', count: 0 }],
          publishYearDistribution: [],
          isPublic: true,
        };
      }

      // 사용자가 읽은 책의 ID 목록 조회
      const readStatusQuery = this.readingStatusRepository
        .createQueryBuilder('status')
        .select('status.bookId', 'bookId')
        .where('status.userId = :userId', { userId })
        .andWhere('status.status = :status', {
          status: ReadingStatusType.READ,
        });

      const readStatuses = await readStatusQuery.getRawMany();
      const bookIds = readStatuses.map((status) => status.bookId);

      this.logger.log(
        `Found ${bookIds.length} read book IDs for user ${userId}`,
      );

      if (bookIds.length === 0) {
        return {
          topAuthors: [{ author: '아직 독서 기록이 없습니다', count: 0 }],
          topPublishers: [{ publisher: '아직 독서 기록이 없습니다', count: 0 }],
          publishYearDistribution: [],
          isPublic: true,
        };
      }

      // 읽은 책 정보 직접 조회
      const booksQuery = this.bookRepository
        .createQueryBuilder('book')
        .select('book.id', 'id')
        .addSelect('book.title', 'title')
        .addSelect('book.author', 'author')
        .addSelect('book.publisher', 'publisher')
        .addSelect('book.publishDate', 'publishDate')
        .where('book.id IN (:...bookIds)', { bookIds });

      const readBooks = await booksQuery.getRawMany();

      this.logger.log(
        `Retrieved ${readBooks.length} books from ${bookIds.length} book IDs for user ${userId}`,
      );

      // 디버깅을 위해 첫 번째 책의 정보 로깅
      if (readBooks.length > 0) {
        this.logger.log(`First book sample: ${JSON.stringify(readBooks[0])}`);
      } else {
        this.logger.warn(
          `No books found despite having ${bookIds.length} book IDs`,
        );
        // 책을 찾을 수 없는 경우 기본값 반환
        return {
          topAuthors: [{ author: '데이터를 찾을 수 없습니다', count: 0 }],
          topPublishers: [{ publisher: '데이터를 찾을 수 없습니다', count: 0 }],
          publishYearDistribution: [],
          isPublic: true,
        };
      }

      // 저자별 통계 계산
      const authorCountMap = new Map<string, number>();

      // 디버깅을 위한 추적 정보
      const authorExtractInfo: {
        id: number;
        title: string;
        originalAuthor: string;
        extractedAuthors: string[];
      }[] = [];

      // 모든 책에서 저자 추출 및 집계
      let validAuthorCount = 0;
      for (const book of readBooks) {
        // 디버깅을 위해 로그 추가
        if (!book.author) {
          this.logger.warn(
            `Book without author: ID=${book.id}, Title=${book.title}`,
          );
          continue;
        }

        // 저자 문자열 파싱
        const authors = this.extractAuthors(book.author);
        validAuthorCount += authors.length > 0 ? 1 : 0;

        // 디버깅용 추적 정보 저장
        authorExtractInfo.push({
          id: book.id,
          title: book.title || '제목 없음',
          originalAuthor: book.author,
          extractedAuthors: authors,
        });

        // 각 저자의 카운트 증가
        for (const author of authors) {
          if (author.trim()) {
            const currentCount = authorCountMap.get(author) || 0;
            authorCountMap.set(author, currentCount + 1);
          }
        }
      }

      this.logger.log(
        `Books with valid authors: ${validAuthorCount} out of ${readBooks.length}`,
      );

      // 디버깅을 위해 extractAuthors 함수가 제대로 작동하는지 확인
      this.logger.log(
        `Author extraction results: ${JSON.stringify(authorExtractInfo.slice(0, 3))}`,
      );
      this.logger.log(`Total unique authors found: ${authorCountMap.size}`);

      // 저자 카운트를 내림차순으로 정렬하여 상위 5명 추출
      let topAuthors = Array.from(authorCountMap.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 저자가 없으면 기본값 설정
      if (topAuthors.length === 0) {
        topAuthors = [{ author: '저자 정보를 추출할 수 없습니다', count: 1 }];
      }

      // 출판사별 통계 계산
      const publisherCountMap = new Map<string, number>();
      let validPublisherCount = 0;

      for (const book of readBooks) {
        if (!book.publisher) {
          this.logger.warn(
            `Book without publisher: ID=${book.id}, Title=${book.title}`,
          );
          continue;
        }
        validPublisherCount++;

        const publisher = book.publisher.trim() || '출판사 미상';
        const currentCount = publisherCountMap.get(publisher) || 0;
        publisherCountMap.set(publisher, currentCount + 1);
      }

      this.logger.log(
        `Books with valid publishers: ${validPublisherCount} out of ${readBooks.length}`,
      );
      this.logger.log(
        `Total unique publishers found: ${publisherCountMap.size}`,
      );

      // 출판사 카운트를 내림차순으로 정렬하여 상위 5개 추출
      let topPublishers = Array.from(publisherCountMap.entries())
        .map(([publisher, count]) => ({ publisher, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 출판사가 없으면 기본값 설정
      if (topPublishers.length === 0) {
        topPublishers = [
          { publisher: '출판사 정보를 추출할 수 없습니다', count: 1 },
        ];
      }

      // 출판년도별 읽은 책 분포
      const yearCountMap = new Map<string, number>();
      let validYearCount = 0;

      for (const book of readBooks) {
        if (!book.publishDate) continue;

        try {
          const pubDate = new Date(book.publishDate);
          // 유효한 날짜인지 확인
          if (isNaN(pubDate.getTime())) {
            this.logger.warn(
              `Invalid publish date format: ${book.publishDate} for book: ${book.title}`,
            );
            continue;
          }

          validYearCount++;
          const year = pubDate.getFullYear().toString();
          const currentCount = yearCountMap.get(year) || 0;
          yearCountMap.set(year, currentCount + 1);
        } catch (err) {
          this.logger.warn(
            `Error processing publish date: ${book.publishDate} for book: ${book.title}`,
          );
        }
      }

      this.logger.log(
        `Books with valid publish years: ${validYearCount} out of ${readBooks.length}`,
      );
      this.logger.log(`Total unique years found: ${yearCountMap.size}`);

      // 출판년도를 오름차순으로 정렬
      const publishYearDistribution = Array.from(yearCountMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));

      return {
        topAuthors,
        topPublishers,
        publishYearDistribution,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(
        `저자/출판사 통계 조회 중 오류: ${error.message}, ${error.stack}`,
      );
      throw error;
    }
  }

  /**
   * 저자 문자열에서 주 저자만 추출
   * 예: "다자이 오사무 (지은이), 김춘미 (옮긴이)" -> ["다자이 오사무"]
   */
  private extractAuthors(authorString: string): string[] {
    // null, undefined, 빈 문자열 처리
    if (!authorString || typeof authorString !== 'string') {
      this.logger.warn(`Invalid author string: ${authorString}`);
      return [];
    }

    // 빈 문자열이나 공백만 있는 경우 처리
    const trimmedAuthorString = authorString.trim();
    if (!trimmedAuthorString) return [];

    try {
      // 여러 저자를 다양한 구분자로 분리 (콤마, 세미콜론, "and" 등)
      const authorParts = trimmedAuthorString.split(/,|;|\band\b|\s*\/\s*/);
      const mainAuthors: string[] = []; // 역할이 명시된 주 저자
      const otherAuthors: string[] = []; // 기타 저자

      for (const part of authorParts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        // 각 부분에서 역할 정보 추출
        // "(지은이)", "(옮긴이)", "(엮은이)", "(그림)" 등의 역할 표시 추출
        const roleMatches = trimmedPart.match(/(.+?)\s*\(([^()]+)\)/);

        if (roleMatches) {
          const name = roleMatches[1].trim();
          const role = roleMatches[2].trim();

          // 주 저자 역할: 지은이, 저자, 글, author 등
          if (
            role === '지은이' ||
            role === '저자' ||
            role === '글' ||
            role === 'author' ||
            role.includes('지음')
          ) {
            if (name) mainAuthors.push(name);
          } else if (
            role === '옮긴이' ||
            role === '그림' ||
            role === '엮은이' ||
            role.includes('옮김')
          ) {
            // 역할이 보조 저자인 경우 따로 저장
            if (name) otherAuthors.push(name);
          } else {
            // 기타 역할은 일단 otherAuthors에 저장
            if (name) otherAuthors.push(name);
          }
        } else {
          // 괄호가 없거나 역할 표시가 없는 저자
          // 괄호와 그 내용 제거 (역할 외의 괄호 정보)
          const cleanedName = trimmedPart.replace(/\s*\([^()]*\)/g, '').trim();
          if (cleanedName) {
            otherAuthors.push(cleanedName);
          }
        }
      }

      // 결과 반환 로직
      if (mainAuthors.length > 0) {
        // 역할이 명시된 주 저자가 있으면 그들만 반환
        return mainAuthors;
      } else if (otherAuthors.length > 0) {
        // 주 저자가 없고 기타 저자만 있는 경우
        if (trimmedAuthorString.includes('(')) {
          // 역할 표시가 있으나 주 저자가 없는 경우, 첫 번째 저자만 반환
          return [otherAuthors[0]];
        } else {
          // 역할 표시가 없는 경우, 모든 저자를 주 저자로 간주
          return otherAuthors;
        }
      }

      // 어떤 저자도 추출하지 못한 경우
      // 원본 문자열에서 괄호 부분 제거하고 첫 번째 단어를 저자로 간주
      const fallbackAuthor = trimmedAuthorString
        .replace(/\([^()]*\)/g, '') // 괄호와 그 내용 제거
        .trim();

      // 빈 문자열이면 원본 반환
      if (!fallbackAuthor) {
        return [
          trimmedAuthorString.length > 30
            ? trimmedAuthorString.substring(0, 30) + '...'
            : trimmedAuthorString,
        ];
      }

      return [fallbackAuthor];
    } catch (error) {
      this.logger.error(
        `Author extraction error: ${error.message} for string: "${authorString}"`,
      );
      // 오류 발생 시 원본 문자열을 그대로 반환
      return [
        authorString.length > 30
          ? authorString.substring(0, 30) + '...'
          : authorString,
      ];
    }
  }

  // 기간별 독서 상태 통계
  async getReadingStatusByPeriod(
    userId: number,
    requestUserId?: number,
  ): Promise<ReadingStatusByPeriodResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReadingStatusByPeriodPublic) {
          // 기간별 독서 상태 통계 권한 사용
          return {
            yearly: this.generateEmptyYearlyData(),
            monthly: this.generateEmptyMonthlyData(),
            weekly: this.generateEmptyWeeklyData(),
            daily: this.generateEmptyDailyData(),
            isPublic: false,
          };
        }
      }

      // 1. 빈 데이터 준비 (항상 5개씩)
      const emptyYearlyData = this.generateEmptyYearlyData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyData(5);

      // 디버깅: 빈 월별 데이터 로깅
      this.logger.debug(
        `emptyMonthlyData: ${JSON.stringify(emptyMonthlyData)}`,
      );

      const emptyWeeklyData = this.generateEmptyWeeklyData();
      const emptyDailyData = this.generateEmptyDailyData();

      // 2. 기간 설정
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      // 1-1. 연도별 데이터 조회 및 처리
      const yearlyData = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select("DATE_FORMAT(status.createdAt, '%Y')", 'year')
        .addSelect('status.status', 'status')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .andWhere('status.createdAt >= :fiveYearsAgo', { fiveYearsAgo })
        .groupBy('year')
        .addGroupBy('status.status')
        .orderBy('year', 'ASC')
        .getRawMany();

      // 1-2. 연도별 데이터 처리
      const yearlyMap = new Map();
      yearlyData.forEach((item) => {
        const year = item.year;
        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, {
            year,
            wantToReadCount: 0,
            readingCount: 0,
            readCount: 0,
          });
        }

        const yearStats = yearlyMap.get(year);
        const count = parseInt(item.count, 10) || 0;

        if (item.status === ReadingStatusType.WANT_TO_READ) {
          yearStats.wantToReadCount = count;
        } else if (item.status === ReadingStatusType.READING) {
          yearStats.readingCount = count;
        } else if (item.status === ReadingStatusType.READ) {
          yearStats.readCount = count;
        }
      });

      // 1-3. 연도별 결과 생성
      const yearlyResult = this.mergeAndSortData(
        emptyYearlyData,
        Array.from(yearlyMap.values()),
        'year',
        5,
      );

      // 2-1. 월별 데이터 조회 및 처리
      const monthlyData = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select("DATE_FORMAT(status.createdAt, '%Y-%m')", 'month')
        .addSelect('status.status', 'status')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .andWhere('status.createdAt >= :fiveMonthsAgo', { fiveMonthsAgo })
        .groupBy('month')
        .addGroupBy('status.status')
        .orderBy('month', 'ASC')
        .getRawMany();

      // 2-2. 월별 데이터 처리 - 각 Status별로 집계
      const monthlyMap = new Map();
      monthlyData.forEach((item) => {
        const month = item.month;
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            wantToReadCount: 0,
            readingCount: 0,
            readCount: 0,
          });
        }

        const monthStats = monthlyMap.get(month);
        const count = parseInt(item.count, 10) || 0;

        if (item.status === ReadingStatusType.WANT_TO_READ) {
          monthStats.wantToReadCount = count;
        } else if (item.status === ReadingStatusType.READING) {
          monthStats.readingCount = count;
        } else if (item.status === ReadingStatusType.READ) {
          monthStats.readCount = count;
        }
      });

      // 디버깅: 실제 월별 데이터 로깅
      this.logger.debug(
        `monthlyMap: ${JSON.stringify(Array.from(monthlyMap.entries()))}`,
      );

      // 2-3. 월별 결과 생성 - 중복 제거 후 정렬
      const monthlyResult = this.mergeAndSortData(
        emptyMonthlyData,
        Array.from(monthlyMap.values()),
        'month',
        5,
      );

      // 디버깅: 최종 월별 결과 로깅
      this.logger.debug(`monthlyResult: ${JSON.stringify(monthlyResult)}`);

      // 3. 주간별 독서 상태 통계 (최근 5주)
      const koreanMonths = [
        '1월',
        '2월',
        '3월',
        '4월',
        '5월',
        '6월',
        '7월',
        '8월',
        '9월',
        '10월',
        '11월',
        '12월',
      ];

      // 최근 5주의 시작일과 끝일 계산
      const weekRanges = [];
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        const endDate = new Date(now);
        endDate.setDate(now.getDate() - i * 7);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);

        weekRanges.push({
          start: startDate,
          end: endDate,
          key: i,
        });
      }

      // 주간 데이터 준비
      const weeklyData = this.generateEmptyWeeklyData();
      // 주차 데이터 정렬
      weeklyData.sort((a, b) => {
        const weekA = parseInt(a.week.match(/(\d+)째주/)[1]);
        const weekB = parseInt(b.week.match(/(\d+)째주/)[1]);
        const monthA = koreanMonths.indexOf(a.week.split(' ')[0]);
        const monthB = koreanMonths.indexOf(b.week.split(' ')[0]);

        if (monthA === monthB) {
          return weekA - weekB;
        }
        return monthA - monthB;
      });

      // 주간 데이터 조회
      const weeklyQueryData = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select("DATE_FORMAT(status.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('status.status', 'status')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .andWhere('status.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('date')
        .addGroupBy('status.status')
        .orderBy('date', 'ASC')
        .getRawMany();

      // 날짜별 데이터를 주차에 할당
      weeklyQueryData.forEach((item) => {
        const itemDate = new Date(item.date);

        // 어떤 주차 범위에 속하는지 확인
        for (let i = 0; i < weekRanges.length; i++) {
          const range = weekRanges[i];
          if (itemDate >= range.start && itemDate <= range.end) {
            const count = parseInt(item.count, 10) || 0;
            const reversedIndex = 4 - i; // 인덱스를 반대로 처리

            if (item.status === ReadingStatusType.WANT_TO_READ) {
              weeklyData[reversedIndex].wantToReadCount += count;
            } else if (item.status === ReadingStatusType.READING) {
              weeklyData[reversedIndex].readingCount += count;
            } else if (item.status === ReadingStatusType.READ) {
              weeklyData[reversedIndex].readCount += count;
            }
            break;
          }
        }
      });

      // 주차 데이터는 항상 5개 사용
      const weeklyResult = weeklyData.slice(0, 5);

      // 4. 일별 독서 상태 통계 (최근 5일)
      // 일별 데이터 준비
      const dailyData = this.generateEmptyDailyData();

      // 일별 데이터 조회
      const dailyQueryResults = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select("DATE_FORMAT(status.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('status.status', 'status')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .andWhere('status.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
        .groupBy('date')
        .addGroupBy('status.status')
        .orderBy('date', 'ASC')
        .getRawMany();

      // 일별 데이터 처리
      const dailyMap = new Map();

      dailyQueryResults.forEach((item) => {
        if (!dailyMap.has(item.date)) {
          dailyMap.set(item.date, {
            date: item.date,
            wantToReadCount: 0,
            readingCount: 0,
            readCount: 0,
          });
        }

        const dateStats = dailyMap.get(item.date);
        const count = parseInt(item.count, 10) || 0;

        if (item.status === ReadingStatusType.WANT_TO_READ) {
          dateStats.wantToReadCount = count;
        } else if (item.status === ReadingStatusType.READING) {
          dateStats.readingCount = count;
        } else if (item.status === ReadingStatusType.READ) {
          dateStats.readCount = count;
        }
      });

      // 빈 데이터와 실제 데이터 병합
      const dailyResult = this.mergeAndSortData(
        dailyData,
        Array.from(dailyMap.values()),
        'date',
        5,
      );

      return {
        yearly: yearlyResult,
        monthly: monthlyResult,
        weekly: weeklyResult,
        daily: dailyResult,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`기간별 독서 상태 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 헬퍼 메서드: 데이터 병합 및 정렬
  private mergeAndSortData<T>(
    emptyData: T[],
    actualData: T[],
    key: string,
    limit: number,
  ): T[] {
    // actualData의 키 값들을 Set으로 추출
    const actualKeys = new Set(actualData.map((item) => item[key]));

    // emptyData 중 actualData에 없는 항목만 필터링
    const filteredEmptyData = emptyData.filter(
      (item) => !actualKeys.has(item[key]),
    );

    // 두 데이터 병합
    const mergedData = [...actualData, ...filteredEmptyData];

    // 키 기준 정렬
    mergedData.sort((a, b) => {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
      return 0;
    });

    // 최대 limit 개수만 반환
    return mergedData.slice(0, limit);
  }

  // 빈 연도별 데이터 생성 헬퍼 메소드
  private generateEmptyYearlyData(count = 5): {
    year: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const currentYear = new Date().getFullYear();

    // 현재 연도부터 과거 count-1년까지 생성
    for (let i = 0; i < count; i++) {
      const year = currentYear - count + i + 1;
      result.push({
        year: year.toString(),
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    return result;
  }

  // 빈 월별 데이터 생성 헬퍼 메소드
  private generateEmptyMonthlyData(count = 5): {
    month: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const today = new Date();

    // 현재 월부터 과거 count-1개월까지 생성
    for (let i = 0; i < count; i++) {
      const monthDate = new Date(today);
      monthDate.setMonth(today.getMonth() - count + i + 1);

      const year = monthDate.getFullYear();
      const month = String(monthDate.getMonth() + 1).padStart(2, '0');

      result.push({
        month: `${year}-${month}`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    return result;
  }

  // 빈 주간별 데이터 생성 헬퍼 메소드
  private generateEmptyWeeklyData(): {
    week: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 0-based month to 1-based month
    const currentDate = now.getDate();
    const currentWeek = Math.ceil(currentDate / 7);

    // 최근 5주의 데이터 생성
    for (let i = 0; i < 5; i++) {
      let week = currentWeek - i;
      let month = currentMonth;

      // 음수 주차 처리 (전월로 넘어가는 경우)
      if (week <= 0) {
        const previousMonth = (currentMonth - 1 + 12) % 12 || 12; // 1월이면 12월로 처리
        week = 4 + week; // 이전 달의 주차 (가정: 한 달에 4주)
        month = previousMonth;
      }

      result.push({
        week: `${month}월 ${week}째주`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 가장 오래된 주부터 표시하기 위해 역순으로 반환
    return result.reverse();
  }

  // 빈 일별 데이터 생성 헬퍼 메소드
  private generateEmptyDailyData(): {
    date: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();

    // 최근 5일의 데이터 생성
    for (let i = 4; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);

      result.push({
        date: this.formatDate(day),
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    return result;
  }
}
