import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, Raw } from 'typeorm';
import { UserStatisticsSetting } from './entities/user-statistics-setting.entity';
import {
  ReadingStatus,
  ReadingStatusType,
} from '../reading-status/entities/reading-status.entity';
import { Book } from '../book/entities/book.entity';
import { Review } from '../review/entities/review.entity';
import { Rating } from '../rating/entities/rating.entity';
import { User } from '../user/entities/user.entity';
import { UserFollower } from '../user/entities/user-follower.entity';
import { Comment } from '../review/entities/comment.entity';
import { ReviewLike } from '../review/entities/review-like.entity';
import { Library } from '../library/entities/library.entity';
import { LibraryBook } from '../library/entities/library-book.entity';
import { LibraryTagMapping } from '../library/entities/library-tag-mapping.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from '../library/entities/library-update-history.entity';
import {
  SearchLog,
  PopularSearch,
  RecentSearch,
} from '../search/search.entity';
import { Category } from '../category/entities/category.entity';
import { SubCategory } from '../category/entities/subcategory.entity';
import {
  UpdateStatisticsSettingDto,
  StatisticsSettingResponseDto,
} from './dto/statistics-setting.dto';
import {
  ReadingStatusStatsResponseDto,
  GenreAnalysisResponseDto,
  AuthorPublisherStatsResponseDto,
  ReviewStatsResponseDto,
  RatingStatsResponseDto,
  ActivityFrequencyResponseDto,
  RatingHabitsResponseDto,
  UserInteractionResponseDto,
  FollowerStatsResponseDto,
  CommentActivityResponseDto,
  ReviewInfluenceResponseDto,
  LibraryCompositionResponseDto,
  LibraryPopularityResponseDto,
  LibraryUpdatePatternResponseDto,
  LibraryDiversityResponseDto,
  AmountStatsResponseDto,
  SearchActivityResponseDto,
  BookMetadataStatsResponseDto,
  RecentPopularSearchDto,
  ReadingStatusByPeriodResponseDto,
} from './dto/statistics-response.dto';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(UserStatisticsSetting)
    private readonly userStatisticsSettingRepository: Repository<UserStatisticsSetting>,
    @InjectRepository(ReadingStatus)
    private readonly readingStatusRepository: Repository<ReadingStatus>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserFollower)
    private readonly userFollowerRepository: Repository<UserFollower>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(ReviewLike)
    private readonly reviewLikeRepository: Repository<ReviewLike>,
    @InjectRepository(Library)
    private readonly libraryRepository: Repository<Library>,
    @InjectRepository(LibraryBook)
    private readonly libraryBookRepository: Repository<LibraryBook>,
    @InjectRepository(LibraryTagMapping)
    private readonly libraryTagMappingRepository: Repository<LibraryTagMapping>,
    @InjectRepository(LibrarySubscription)
    private readonly librarySubscriptionRepository: Repository<LibrarySubscription>,
    @InjectRepository(LibraryUpdateHistory)
    private readonly libraryUpdateHistoryRepository: Repository<LibraryUpdateHistory>,
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(PopularSearch)
    private readonly popularSearchRepository: Repository<PopularSearch>,
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  // 통계 설정 관련 메서드
  async getOrCreateUserStatisticsSetting(
    userId: number,
  ): Promise<UserStatisticsSetting> {
    try {
      let setting = await this.userStatisticsSettingRepository.findOne({
        where: { userId },
      });

      if (!setting) {
        setting = this.userStatisticsSettingRepository.create({ userId });
        await this.userStatisticsSettingRepository.save(setting);
      }

      return setting;
    } catch (error) {
      this.logger.error(`통계 설정 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async updateUserStatisticsSetting(
    userId: number,
    updateDto: UpdateStatisticsSettingDto,
  ): Promise<StatisticsSettingResponseDto> {
    try {
      const setting = await this.getOrCreateUserStatisticsSetting(userId);

      // 필드 업데이트
      Object.assign(setting, updateDto);

      await this.userStatisticsSettingRepository.save(setting);

      return this.mapToStatisticsSettingResponseDto(setting);
    } catch (error) {
      this.logger.error(`통계 설정 업데이트 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getUserStatisticsSettings(
    userId: number,
  ): Promise<StatisticsSettingResponseDto> {
    try {
      const setting = await this.getOrCreateUserStatisticsSetting(userId);
      return this.mapToStatisticsSettingResponseDto(setting);
    } catch (error) {
      this.logger.error(`통계 설정 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  private mapToStatisticsSettingResponseDto(
    setting: UserStatisticsSetting,
  ): StatisticsSettingResponseDto {
    return {
      isReadingStatusPublic: setting.isReadingStatusPublic,
      isReadingStatusByPeriodPublic: setting.isReadingStatusByPeriodPublic,
      isGenreAnalysisPublic: setting.isGenreAnalysisPublic,
      isAuthorPublisherStatsPublic: setting.isAuthorPublisherStatsPublic,
      isReviewStatsPublic: setting.isReviewStatsPublic,
      isRatingStatsPublic: setting.isRatingStatsPublic,
      isActivityFrequencyPublic: setting.isActivityFrequencyPublic,
      isRatingHabitsPublic: setting.isRatingHabitsPublic,
      isUserInteractionPublic: setting.isUserInteractionPublic,
      isFollowerStatsPublic: setting.isFollowerStatsPublic,
      isCommentActivityPublic: setting.isCommentActivityPublic,
      isReviewInfluencePublic: setting.isReviewInfluencePublic,
      isLibraryCompositionPublic: setting.isLibraryCompositionPublic,
      isLibraryPopularityPublic: setting.isLibraryPopularityPublic,
      isLibraryUpdatePatternPublic: setting.isLibraryUpdatePatternPublic,
      isLibraryDiversityPublic: setting.isLibraryDiversityPublic,
      isAmountStatsPublic: setting.isAmountStatsPublic,
      isSearchActivityPublic: setting.isSearchActivityPublic,
      isBookMetadataStatsPublic: setting.isBookMetadataStatsPublic,
    };
  }

  // 독서 통계 메서드 - 각 통계 메서드를 구현해주세요
  // 1. 독서 상태별 도서 수 통계
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

  // 추가: 나머지 통계 메서드들의 기본 구조
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
            categoryCounts: this.generateDefaultCategories(),
            subCategoryCounts: this.generateDefaultSubCategories(),
            mostReadCategory: '미분류',
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

      let categoryCounts = [];
      let subCategoryCounts = [];
      let mostReadCategory = '미분류';
      let yearly = this.generateEmptyYearlyGenreData();
      let monthly = this.generateEmptyMonthlyGenreData();
      let weekly = this.generateEmptyWeeklyGenreData();
      let daily = this.generateEmptyDailyGenreData();

      if (totalReadBooks > 0) {
        // 기존 카테고리와 서브카테고리 통계 로직
        // ... (기존 코드와 동일)

        // 연도별 장르 통계
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        // 연도별 카테고리 통계
        // 사용자가 읽은 책의 카테고리별 통계
        const categoryCountsQuery = this.readingStatusRepository
          .createQueryBuilder('status')
          .innerJoin('status.book', 'book')
          .leftJoin('book.category', 'category')
          .select(
            "CASE WHEN category.id IS NULL THEN '미분류' ELSE category.name END",
            'category',
          )
          .addSelect('COUNT(book.id)', 'count')
          .where('status.userId = :userId', { userId })
          .andWhere('status.status = :status', {
            status: ReadingStatusType.READ,
          })
          .groupBy(
            "CASE WHEN category.id IS NULL THEN '미분류' ELSE category.name END",
          )
          .orderBy('count', 'DESC');

        const categoryCountsData = await categoryCountsQuery.getRawMany();

        // 카테고리별 데이터가 없으면 미분류로 모든 책 처리
        if (categoryCountsData.length === 0 && totalReadBooks > 0) {
          categoryCounts = [{ category: '미분류', count: totalReadBooks }];
        } else {
          categoryCounts = categoryCountsData.map((item) => ({
            category: item.category || '미분류',
            count: parseInt(item.count, 10) || 0,
          }));
        }

        // 사용자가 읽은 책의 서브카테고리별 통계
        const subCategoryCountsQuery = this.readingStatusRepository
          .createQueryBuilder('status')
          .innerJoin('status.book', 'book')
          .leftJoin('book.subcategory', 'subCategory')
          .select(
            "CASE WHEN subCategory.id IS NULL THEN '미분류' ELSE subCategory.name END",
            'subCategory',
          )
          .addSelect('COUNT(book.id)', 'count')
          .where('status.userId = :userId', { userId })
          .andWhere('status.status = :status', {
            status: ReadingStatusType.READ,
          })
          .groupBy(
            "CASE WHEN subCategory.id IS NULL THEN '미분류' ELSE subCategory.name END",
          )
          .orderBy('count', 'DESC');

        const subCategoryCountsData = await subCategoryCountsQuery.getRawMany();

        // 서브카테고리별 데이터가 없으면 미분류로 모든 책 처리
        if (subCategoryCountsData.length === 0 && totalReadBooks > 0) {
          subCategoryCounts = [
            { subCategory: '미분류', count: totalReadBooks },
          ];
        } else {
          subCategoryCounts = subCategoryCountsData.map((item) => ({
            subCategory: item.subCategory || '미분류',
            count: parseInt(item.count, 10) || 0,
          }));
        }

        // 가장 많이 읽은 카테고리
        if (categoryCounts.length > 0) {
          mostReadCategory = categoryCounts[0].category;
        }

        // 카테고리 데이터가 5개 미만이면 기본 카테고리로 채움
        if (categoryCounts.length < 5) {
          const defaultCategories = this.generateDefaultCategories();

          // 이미 있는 카테고리는 제외
          const existingCategories = new Set(
            categoryCounts.map((item) => item.category),
          );
          const additionalCategories = defaultCategories
            .filter((item) => !existingCategories.has(item.category))
            .slice(0, 5 - categoryCounts.length);

          categoryCounts = [...categoryCounts, ...additionalCategories];
        } else {
          // 5개로 제한
          categoryCounts = categoryCounts.slice(0, 5);
        }

        // 서브카테고리 데이터가 5개 미만이면 기본 서브카테고리로 채움
        if (subCategoryCounts.length < 5) {
          const defaultSubCategories = this.generateDefaultSubCategories();

          // 이미 있는 서브카테고리는 제외
          const existingSubCategories = new Set(
            subCategoryCounts.map((item) => item.subCategory),
          );
          const additionalSubCategories = defaultSubCategories
            .filter((item) => !existingSubCategories.has(item.subCategory))
            .slice(0, 5 - subCategoryCounts.length);

          subCategoryCounts = [
            ...subCategoryCounts,
            ...additionalSubCategories,
          ];
        } else {
          // 5개로 제한
          subCategoryCounts = subCategoryCounts.slice(0, 5);
        }

        // 연도별, 월별, 주별, 일별 데이터 업데이트
        // 카테고리와 서브카테고리 데이터가 있으면, 기간별 데이터에 해당 값을 반영

        // 연도별 데이터 업데이트
        yearly = this.generateEmptyYearlyGenreData().map((item) => {
          return {
            ...item,
            categories:
              categoryCounts.length > 0
                ? categoryCounts.slice(0, 1).map((c) => ({ ...c })) // 가장 많이 읽은 카테고리만 표시
                : [{ category: '미분류', count: 0 }],
            subCategories:
              subCategoryCounts.length > 0
                ? subCategoryCounts.slice(0, 1).map((sc) => ({ ...sc })) // 가장 많이 읽은 서브카테고리만 표시
                : [{ subCategory: '미분류', count: 0 }],
          };
        });

        // 월별 데이터 업데이트
        monthly = this.generateEmptyMonthlyGenreData().map((item) => {
          return {
            ...item,
            categories:
              categoryCounts.length > 0
                ? categoryCounts.slice(0, 1).map((c) => ({ ...c }))
                : [{ category: '미분류', count: 0 }],
            subCategories:
              subCategoryCounts.length > 0
                ? subCategoryCounts.slice(0, 1).map((sc) => ({ ...sc }))
                : [{ subCategory: '미분류', count: 0 }],
          };
        });

        // 주별 데이터 업데이트
        weekly = this.generateEmptyWeeklyGenreData().map((item) => {
          return {
            ...item,
            categories:
              categoryCounts.length > 0
                ? categoryCounts.slice(0, 1).map((c) => ({ ...c }))
                : [{ category: '미분류', count: 0 }],
            subCategories:
              subCategoryCounts.length > 0
                ? subCategoryCounts.slice(0, 1).map((sc) => ({ ...sc }))
                : [{ subCategory: '미분류', count: 0 }],
          };
        });

        // 일별 데이터 업데이트
        daily = this.generateEmptyDailyGenreData().map((item) => {
          return {
            ...item,
            categories:
              categoryCounts.length > 0
                ? categoryCounts.slice(0, 1).map((c) => ({ ...c }))
                : [{ category: '미분류', count: 0 }],
            subCategories:
              subCategoryCounts.length > 0
                ? subCategoryCounts.slice(0, 1).map((sc) => ({ ...sc }))
                : [{ subCategory: '미분류', count: 0 }],
          };
        });
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
      this.logger.error(
        `장르/카테고리 분석 통계 조회 중 오류: ${error.message}`,
      );
      // 오류 발생시 기본값 반환
      return {
        categoryCounts: this.generateDefaultCategories(),
        subCategoryCounts: this.generateDefaultSubCategories(),
        mostReadCategory: '미분류',
        yearly: this.generateEmptyYearlyGenreData(),
        monthly: this.generateEmptyMonthlyGenreData(),
        weekly: this.generateEmptyWeeklyGenreData(),
        daily: this.generateEmptyDailyGenreData(),
        isPublic: true,
      };
    }
  }

  // 기본 카테고리 생성 (항상 5개 반환)
  private generateDefaultCategories(): { category: string; count: number }[] {
    return [
      { category: '미분류', count: 0 },
      { category: '소설', count: 0 },
      { category: '인문학', count: 0 },
      { category: '경제/경영', count: 0 },
      { category: '자기계발', count: 0 },
    ];
  }

  // 기본 서브카테고리 생성 (항상 5개 반환)
  private generateDefaultSubCategories(): {
    subCategory: string;
    count: number;
  }[] {
    return [
      { subCategory: '미분류', count: 0 },
      { subCategory: '한국소설', count: 0 },
      { subCategory: '외국소설', count: 0 },
      { subCategory: '심리학', count: 0 },
      { subCategory: '에세이', count: 0 },
    ];
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

      let publishYearDistribution = Array.from(yearCountMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));

      return {
        topAuthors,
        topPublishers,
        publishYearDistribution,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`저자/출판사 통계 조회 중 오류: ${error.message}`);
      this.logger.error(error.stack);
      // 오류 발생시 기본값 반환
      return {
        topAuthors: [
          { author: '데이터 처리 중 오류가 발생했습니다', count: 0 },
        ],
        topPublishers: [
          { publisher: '데이터 처리 중 오류가 발생했습니다', count: 0 },
        ],
        publishYearDistribution: [],
        isPublic: true,
      };
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

  async getReviewStats(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReviewStatsPublic) {
          return {
            totalReviews: 0,
            monthlyReviewCounts: [],
            reviewTypeDistribution: [],
            averageReviewLength: 0,
            isPublic: false,
          };
        }
      }

      // 사용자의 총 리뷰 수
      const totalReviews = await this.reviewRepository.count({
        where: { authorId: userId },
      });

      // 월별 리뷰 작성 수 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyReviewCountsData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyReviewCounts = monthlyReviewCountsData.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      }));

      // 리뷰 유형별 작성 비율
      // 리뷰 길이에 따라 분류 (짧은 리뷰, 중간 리뷰, 긴 리뷰)
      const shortReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw((alias) => `LENGTH(${alias}) <= 200`),
        },
      });

      const mediumReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw(
            (alias) => `LENGTH(${alias}) > 200 AND LENGTH(${alias}) <= 1000`,
          ),
        },
      });

      const longReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          content: Raw((alias) => `LENGTH(${alias}) > 1000`),
        },
      });

      // 비율 계산
      const reviewTypeDistribution = [];
      if (totalReviews > 0) {
        reviewTypeDistribution.push({
          type: '짧은 리뷰 (200자 이하)',
          percentage: (shortReviewsCount / totalReviews) * 100,
        });
        reviewTypeDistribution.push({
          type: '중간 리뷰 (201-1000자)',
          percentage: (mediumReviewsCount / totalReviews) * 100,
        });
        reviewTypeDistribution.push({
          type: '긴 리뷰 (1000자 초과)',
          percentage: (longReviewsCount / totalReviews) * 100,
        });
      }

      // 리뷰당 평균 글자 수
      let averageReviewLength = 0;
      if (totalReviews > 0) {
        const lengthData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('AVG(LENGTH(review.content))', 'average')
          .where('review.authorId = :userId', { userId })
          .getRawOne();

        averageReviewLength = lengthData
          ? parseFloat(lengthData.average) || 0
          : 0;
      }

      return {
        totalReviews,
        monthlyReviewCounts,
        reviewTypeDistribution,
        averageReviewLength,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`리뷰 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getRatingStats(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isRatingStatsPublic) {
          return {
            averageRating: 0,
            ratingDistribution: [],
            categoryRatings: [],
            monthlyAverageRatings: [],
            isPublic: false,
          };
        }
      }

      // 사용자의 평균 평점 계산
      const ratingsData = await this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .where('rating.userId = :userId', { userId })
        .getRawOne();

      const averageRating = ratingsData
        ? parseFloat(ratingsData.average) || 0
        : 0;

      // 평점 분포 (1점부터 5점까지)
      const ratingDistribution = [];
      for (let rating = 1; rating <= 5; rating++) {
        const count = await this.ratingRepository.count({
          where: {
            userId,
            rating,
          },
        });
        ratingDistribution.push({ rating, count });
      }

      // 카테고리별 평균 평점
      const categoryRatingsData = await this.ratingRepository
        .createQueryBuilder('rating')
        .leftJoin('rating.book', 'book')
        .leftJoin('book.category', 'category')
        .select('category.name', 'category')
        .addSelect('AVG(rating.rating)', 'averageRating')
        .addSelect('COUNT(rating.id)', 'count')
        .where('rating.userId = :userId', { userId })
        .groupBy('category.name')
        .having('COUNT(rating.id) > 0')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      const categoryRatings = categoryRatingsData.map((item) => ({
        category: item.category || '미분류',
        averageRating: parseFloat(item.averageRating) || 0,
      }));

      // 월별 평균 평점 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyRatingsData = await this.ratingRepository
        .createQueryBuilder('rating')
        .select("DATE_FORMAT(rating.createdAt, '%Y-%m')", 'month')
        .addSelect('AVG(rating.rating)', 'averageRating')
        .where('rating.userId = :userId', { userId })
        .andWhere('rating.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyAverageRatings = monthlyRatingsData.map((item) => ({
        month: item.month,
        averageRating: parseFloat(item.averageRating) || 0,
      }));

      return {
        averageRating,
        ratingDistribution,
        categoryRatings,
        monthlyAverageRatings,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`평점 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getActivityFrequency(
    userId: number,
    requestUserId?: number,
  ): Promise<ActivityFrequencyResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isActivityFrequencyPublic) {
          return {
            averageReviewInterval: 0,
            averageRatingInterval: 0,
            mostActiveHour: '',
            mostActiveDay: '',
            isPublic: false,
          };
        }
      }

      // 평균 리뷰 작성 주기 (일)
      let averageReviewInterval = 0;
      const reviewDatesQuery = await this.reviewRepository
        .createQueryBuilder('review')
        .select('review.createdAt', 'date')
        .where('review.authorId = :userId', { userId })
        .orderBy('review.createdAt', 'ASC')
        .getRawMany();

      if (reviewDatesQuery.length > 1) {
        const reviewDates = reviewDatesQuery.map((item) => new Date(item.date));
        let totalDays = 0;
        for (let i = 1; i < reviewDates.length; i++) {
          const diffTime = Math.abs(
            reviewDates[i].getTime() - reviewDates[i - 1].getTime(),
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDays += diffDays;
        }
        averageReviewInterval = totalDays / (reviewDates.length - 1);
      }

      // 평균 평점 등록 주기 (일)
      let averageRatingInterval = 0;
      const ratingDatesQuery = await this.ratingRepository
        .createQueryBuilder('rating')
        .select('rating.createdAt', 'date')
        .where('rating.userId = :userId', { userId })
        .orderBy('rating.createdAt', 'ASC')
        .getRawMany();

      if (ratingDatesQuery.length > 1) {
        const ratingDates = ratingDatesQuery.map((item) => new Date(item.date));
        let totalDays = 0;
        for (let i = 1; i < ratingDates.length; i++) {
          const diffTime = Math.abs(
            ratingDates[i].getTime() - ratingDates[i - 1].getTime(),
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDays += diffDays;
        }
        averageRatingInterval = totalDays / (ratingDates.length - 1);
      }

      // 독서 활동이 가장 활발한 시간대
      const activeHourData = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select('HOUR(status.createdAt)', 'hour')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .groupBy('hour')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne();

      let mostActiveHour = '';
      if (activeHourData) {
        const hour = parseInt(activeHourData.hour, 10);
        mostActiveHour = `${hour}시 ~ ${hour + 1}시`;
      } else {
        mostActiveHour = '데이터 없음';
      }

      // 독서 활동이 가장 활발한 요일
      const activeDayData = await this.readingStatusRepository
        .createQueryBuilder('status')
        .select('DAYNAME(status.createdAt)', 'day')
        .addSelect('COUNT(status.id)', 'count')
        .where('status.userId = :userId', { userId })
        .groupBy('day')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne();

      // 요일 한글 변환 맵
      const dayNameMap = {
        Monday: '월요일',
        Tuesday: '화요일',
        Wednesday: '수요일',
        Thursday: '목요일',
        Friday: '금요일',
        Saturday: '토요일',
        Sunday: '일요일',
      };

      let mostActiveDay = '';
      if (activeDayData) {
        mostActiveDay = dayNameMap[activeDayData.day] || activeDayData.day;
      } else {
        mostActiveDay = '데이터 없음';
      }

      return {
        averageReviewInterval,
        averageRatingInterval,
        mostActiveHour,
        mostActiveDay,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`액티비티 빈도 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getRatingHabits(
    userId: number,
    requestUserId?: number,
  ): Promise<RatingHabitsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isRatingHabitsPublic) {
          return {
            highestRatedBooks: [],
            lowestRatedBooks: [],
            ratingLengthCorrelation: [],
            isPublic: false,
          };
        }
      }

      try {
        // 가장 높은 평점을 준 책 TOP 5
        const highestRatedBooksData = await this.ratingRepository
          .createQueryBuilder('rating')
          .leftJoin('rating.book', 'book')
          .select('book.title', 'title')
          .addSelect('book.author', 'author')
          .addSelect('rating.rating', 'rating')
          .where('rating.userId = :userId', { userId })
          .orderBy('rating.rating', 'DESC')
          .addOrderBy('book.title', 'ASC')
          .limit(5)
          .getRawMany();

        const highestRatedBooks = highestRatedBooksData.map((item) => ({
          title: item.title || '제목 없음',
          author: item.author || '저자 미상',
          rating: parseFloat(item.rating),
        }));

        // 가장 낮은 평점을 준 책 TOP 5
        const lowestRatedBooksData = await this.ratingRepository
          .createQueryBuilder('rating')
          .leftJoin('rating.book', 'book')
          .select('book.title', 'title')
          .addSelect('book.author', 'author')
          .addSelect('rating.rating', 'rating')
          .where('rating.userId = :userId', { userId })
          .orderBy('rating.rating', 'ASC')
          .addOrderBy('book.title', 'ASC')
          .limit(5)
          .getRawMany();

        const lowestRatedBooks = lowestRatedBooksData.map((item) => ({
          title: item.title || '제목 없음',
          author: item.author || '저자 미상',
          rating: parseFloat(item.rating),
        }));

        // 평점별 리뷰 길이 상관관계
        const ratingLengthCorrelationData = await this.reviewRepository
          .createQueryBuilder('review')
          .leftJoin('review.books', 'reviewBook')
          .leftJoin(
            'rating',
            'rating',
            'rating.bookId = reviewBook.bookId AND rating.userId = review.authorId',
          )
          .select('rating.rating', 'rating')
          .addSelect('AVG(LENGTH(review.content))', 'averageLength')
          .where('review.authorId = :userId', { userId })
          .groupBy('rating.rating')
          .orderBy('rating.rating', 'ASC')
          .getRawMany();

        const ratingLengthCorrelation = ratingLengthCorrelationData.map(
          (item) => ({
            rating: parseFloat(item.rating) || 0,
            averageLength: parseFloat(item.averageLength) || 0,
          }),
        );

        return {
          highestRatedBooks,
          lowestRatedBooks,
          ratingLengthCorrelation,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `평가 습관 통계 데이터 조회 중 오류: ${error.message}`,
        );
        // 오류 발생시 기본값 반환
        return {
          highestRatedBooks: [],
          lowestRatedBooks: [],
          ratingLengthCorrelation: [],
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`평가 습관 통계 조회 중 오류: ${error.message}`);
      // 오류 발생시 기본값 반환
      return {
        highestRatedBooks: [],
        lowestRatedBooks: [],
        ratingLengthCorrelation: [],
        isPublic: true,
      };
    }
  }

  async getUserInteraction(
    userId: number,
    requestUserId?: number,
  ): Promise<UserInteractionResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isUserInteractionPublic) {
          return {
            totalLikesReceived: 0,
            totalCommentsReceived: 0,
            engagementRate: 0,
            monthlyLikes: [],
            isPublic: false,
          };
        }
      }

      try {
        // 받은 좋아요 총계
        const totalLikesReceived = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        // 받은 댓글 총계
        const totalCommentsReceived = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        // 인게이지먼트 비율 계산
        // (받은 좋아요 + 받은 댓글) / 작성한 리뷰 수 * 100
        const totalReviews = await this.reviewRepository.count({
          where: { authorId: userId },
        });

        let engagementRate = 0;
        if (totalReviews > 0) {
          engagementRate =
            ((totalLikesReceived + totalCommentsReceived) / totalReviews) * 100;
        }

        // 월별 받은 좋아요 수 (최근 12개월)
        const oneYearAgo = new Date();
        oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

        const monthlyLikesData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :oneYearAgo', { oneYearAgo })
          .groupBy('month')
          .orderBy('month', 'ASC')
          .getRawMany();

        const monthlyLikes = monthlyLikesData.map((item) => ({
          month: item.month,
          count: parseInt(item.count, 10),
        }));

        return {
          totalLikesReceived,
          totalCommentsReceived,
          engagementRate,
          monthlyLikes,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `사용자 상호작용 통계 데이터 조회 중 오류: ${error.message}`,
        );
        return {
          totalLikesReceived: 0,
          totalCommentsReceived: 0,
          engagementRate: 0,
          monthlyLikes: [],
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`사용자 상호작용 통계 조회 중 오류: ${error.message}`);
      return {
        totalLikesReceived: 0,
        totalCommentsReceived: 0,
        engagementRate: 0,
        monthlyLikes: [],
        isPublic: true,
      };
    }
  }

  async getFollowerStats(
    userId: number,
    requestUserId?: number,
  ): Promise<FollowerStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isFollowerStatsPublic) {
          return {
            followersCount: 0,
            followingCount: 0,
            followerGrowth: [],
            isPublic: false,
          };
        }
      }

      // 현재 팔로워 수 조회
      const followersCount = await this.userFollowerRepository.count({
        where: { following_id: userId },
      });

      // 현재 팔로잉 수 조회
      const followingCount = await this.userFollowerRepository.count({
        where: { follower_id: userId },
      });

      // 월별 팔로워 증가 추이 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      // 월별 팔로워 추가 수 조회
      const followerGrowthData = await this.userFollowerRepository
        .createQueryBuilder('follower')
        .select("DATE_FORMAT(follower.created_at, '%Y-%m')", 'month')
        .addSelect('COUNT(follower.id)', 'count')
        .where('follower.following_id = :userId', { userId })
        .andWhere('follower.created_at >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const followerGrowth = followerGrowthData.map((item) => ({
        date: item.month,
        count: parseInt(item.count, 10),
      }));

      return {
        followersCount,
        followingCount,
        followerGrowth,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`팔로워/팔로잉 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getCommentActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<CommentActivityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isCommentActivityPublic) {
          return {
            totalComments: 0,
            commentsPerWeek: 0,
            commentsPerReview: [],
            isPublic: false,
          };
        }
      }

      // 작성한 댓글 수
      const totalComments = await this.commentRepository.count({
        where: { authorId: userId },
      });

      // 주당 댓글 작성 빈도
      let commentsPerWeek = 0;

      if (totalComments > 0) {
        // 최초 댓글 작성일
        const firstCommentDate = await this.commentRepository
          .createQueryBuilder('comment')
          .select('MIN(comment.createdAt)', 'firstDate')
          .where('comment.authorId = :userId', { userId })
          .getRawOne();

        if (firstCommentDate && firstCommentDate.firstDate) {
          const firstDate = new Date(firstCommentDate.firstDate);
          const now = new Date();
          const totalWeeks = Math.max(
            1,
            Math.ceil(
              (now.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
            ),
          );
          commentsPerWeek = totalComments / totalWeeks;
        }
      }

      // 리뷰별 댓글 수 분포
      const commentsPerReviewData = [
        { range: '0', count: 0 },
        { range: '1-5', count: 0 },
        { range: '6-10', count: 0 },
        { range: '10+', count: 0 },
      ];

      // 사용자가 작성한 각 리뷰별 댓글 수를 계산
      const reviewCommentCountsData = await this.reviewRepository
        .createQueryBuilder('review')
        .leftJoin('review.comments', 'comment')
        .select('review.id', 'reviewId')
        .addSelect('COUNT(comment.id)', 'commentCount')
        .where('review.authorId = :userId', { userId })
        .groupBy('review.id')
        .getRawMany();

      // 각 구간별로 리뷰 수 계산
      reviewCommentCountsData.forEach((item) => {
        const count = parseInt(item.commentCount, 10);
        if (count === 0) {
          commentsPerReviewData[0].count++;
        } else if (count >= 1 && count <= 5) {
          commentsPerReviewData[1].count++;
        } else if (count >= 6 && count <= 10) {
          commentsPerReviewData[2].count++;
        } else {
          commentsPerReviewData[3].count++;
        }
      });

      return {
        totalComments,
        commentsPerWeek,
        commentsPerReview: commentsPerReviewData,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`댓글 활동 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getReviewInfluence(
    userId: number,
    requestUserId?: number,
  ): Promise<ReviewInfluenceResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isReviewInfluencePublic) {
          return {
            averageLikesPerReview: 0,
            popularReviews: [],
            communityContributionScore: 0,
            isPublic: false,
          };
        }
      }

      try {
        // 리뷰당 평균 좋아요 수
        const likesData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('AVG(review.likeCount)', 'average')
          .where('review.authorId = :userId', { userId })
          .getRawOne();

        const averageLikesPerReview = likesData
          ? parseFloat(likesData.average) || 0
          : 0;

        // 가장 인기 있는 리뷰 TOP 5
        const popularReviewsData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('review.id', 'id')
          .addSelect('SUBSTRING(review.content, 1, 100)', 'content')
          .addSelect('review.likeCount', 'likes')
          .where('review.authorId = :userId', { userId })
          .orderBy('review.likeCount', 'DESC')
          .limit(5)
          .getRawMany();

        const popularReviews = popularReviewsData.map((item) => ({
          id: parseInt(item.id, 10),
          content:
            (item.content || '내용 없음') +
            (item.content && item.content.length >= 100 ? '...' : ''),
          likes: parseInt(item.likes, 10) || 0,
        }));

        // 커뮤니티 기여도 점수 (리뷰 수 + 받은 좋아요 수 + 받은 댓글 수)
        const totalReviews = await this.reviewRepository.count({
          where: { authorId: userId },
        });

        const totalLikes = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        const totalComments = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .where('review.authorId = :userId', { userId })
          .getCount();

        const communityContributionScore =
          totalReviews + totalLikes + totalComments;

        return {
          averageLikesPerReview,
          popularReviews,
          communityContributionScore,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `리뷰 영향력 통계 데이터 조회 중 오류: ${error.message}`,
        );
        return {
          averageLikesPerReview: 0,
          popularReviews: [],
          communityContributionScore: 0,
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`리뷰 영향력 통계 조회 중 오류: ${error.message}`);
      return {
        averageLikesPerReview: 0,
        popularReviews: [],
        communityContributionScore: 0,
        isPublic: true,
      };
    }
  }

  async getLibraryComposition(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryCompositionResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryCompositionPublic) {
          return {
            totalLibraries: 0,
            booksPerLibrary: [],
            tagsDistribution: [],
            isPublic: false,
          };
        }
      }

      // 생성한 서재 수
      const totalLibraries = await this.libraryRepository.count({
        where: { ownerId: userId },
      });

      // 서재별 도서 수
      const booksPerLibraryData = await this.libraryRepository
        .createQueryBuilder('library')
        .leftJoin('library.libraryBooks', 'libraryBook')
        .select('library.name', 'name')
        .addSelect('COUNT(libraryBook.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .orderBy('count', 'DESC')
        .getRawMany();

      const booksPerLibrary = booksPerLibraryData.map((item) => ({
        name: item.name,
        count: parseInt(item.count, 10),
      }));

      // 서재별 태그 분포
      const librariesWithTags = await this.libraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.libraryTagMappings', 'tagMapping')
        .leftJoinAndSelect('tagMapping.libraryTag', 'libraryTag')
        .where('library.ownerId = :userId', { userId })
        .getMany();

      const tagsDistribution = [];

      for (const library of librariesWithTags) {
        const tagCounts = {};

        // 태그 카운팅
        if (
          library.libraryTagMappings &&
          library.libraryTagMappings.length > 0
        ) {
          library.libraryTagMappings.forEach((mapping) => {
            if (mapping.libraryTag && mapping.libraryTag.name) {
              const tagName = mapping.libraryTag.name;
              tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
          });
        }

        // 객체에서 배열로 변환
        const tags = Object.entries(tagCounts).map(([tag, count]) => ({
          tag,
          count: count as number,
        }));

        // 결과에 추가
        if (tags.length > 0) {
          tagsDistribution.push({
            library: library.name,
            tags,
          });
        }
      }

      return {
        totalLibraries,
        booksPerLibrary,
        tagsDistribution,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`서재 구성 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getLibraryPopularity(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryPopularityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryPopularityPublic) {
          return {
            subscribersPerLibrary: [],
            mostPopularLibrary: '',
            popularityTrend: [],
            isPublic: false,
          };
        }
      }

      // 서재별 구독자 수
      const subscribersPerLibraryData = await this.libraryRepository
        .createQueryBuilder('library')
        .select('library.name', 'library')
        .addSelect('library.subscriberCount', 'subscribers')
        .where('library.ownerId = :userId', { userId })
        .orderBy('library.subscriberCount', 'DESC')
        .getRawMany();

      const subscribersPerLibrary = subscribersPerLibraryData.map((item) => ({
        library: item.library,
        subscribers: parseInt(item.subscribers, 10),
      }));

      // 가장 인기 있는 서재
      let mostPopularLibrary = '없음';
      if (
        subscribersPerLibrary.length > 0 &&
        subscribersPerLibrary[0].subscribers > 0
      ) {
        mostPopularLibrary = subscribersPerLibrary[0].library;
      }

      // 서재 인기도 추이 (월별)
      const librariesPopularityData = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.name', 'library')
        .addSelect("DATE_FORMAT(subscription.createdAt, '%Y-%m')", 'date')
        .addSelect('COUNT(subscription.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .addGroupBy('date')
        .orderBy('library.name', 'ASC')
        .addOrderBy('date', 'ASC')
        .getRawMany();

      // 결과를 서재별로 그룹화
      interface TrendItem {
        date: string;
        subscribers: number;
      }

      interface LibraryTrend {
        library: string;
        trend: TrendItem[];
      }

      const popularityTrendMap: Record<string, LibraryTrend> = {};

      librariesPopularityData.forEach((item) => {
        if (!popularityTrendMap[item.library]) {
          popularityTrendMap[item.library] = {
            library: item.library,
            trend: [],
          };
        }

        popularityTrendMap[item.library].trend.push({
          date: item.date,
          subscribers: parseInt(item.count, 10),
        });
      });

      const popularityTrend: LibraryTrend[] = Object.values(popularityTrendMap);

      return {
        subscribersPerLibrary,
        mostPopularLibrary,
        popularityTrend,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`서재 인기도 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getLibraryUpdatePattern(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryUpdatePatternResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryUpdatePatternPublic) {
          return {
            updateFrequency: [],
            mostActiveLibrary: '',
            weekdayActivity: [],
            isPublic: false,
          };
        }
      }

      // 서재별 업데이트 빈도
      const updateFrequencyData = await this.libraryUpdateHistoryRepository
        .createQueryBuilder('history')
        .innerJoin('history.library', 'library')
        .select('library.name', 'library')
        .addSelect(
          'COUNT(history.id) / (DATEDIFF(NOW(), MIN(history.createdAt)) / 30)',
          'updatesPerMonth',
        )
        .where('library.ownerId = :userId', { userId })
        .groupBy('library.id')
        .having('COUNT(history.id) > 0')
        .orderBy('updatesPerMonth', 'DESC')
        .getRawMany();

      const updateFrequency = updateFrequencyData.map((item) => ({
        library: item.library,
        updatesPerMonth: parseFloat(item.updatesPerMonth) || 0,
      }));

      // 업데이트가 가장 활발한 서재
      let mostActiveLibrary = '없음';
      if (updateFrequency.length > 0) {
        mostActiveLibrary = updateFrequency[0].library;
      }

      // 요일별 서재 활동
      const weekdayActivityData = await this.libraryUpdateHistoryRepository
        .createQueryBuilder('history')
        .innerJoin('history.library', 'library')
        .select('DAYNAME(history.createdAt)', 'day')
        .addSelect('COUNT(history.id)', 'count')
        .where('library.ownerId = :userId', { userId })
        .groupBy('day')
        .orderBy(
          "FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')",
        )
        .getRawMany();

      // 요일 한글 변환 맵
      const dayNameMap = {
        Monday: '월요일',
        Tuesday: '화요일',
        Wednesday: '수요일',
        Thursday: '목요일',
        Friday: '금요일',
        Saturday: '토요일',
        Sunday: '일요일',
      };

      const weekdayActivity = weekdayActivityData.map((item) => ({
        day: dayNameMap[item.day] || item.day,
        count: parseInt(item.count, 10),
      }));

      return {
        updateFrequency,
        mostActiveLibrary,
        weekdayActivity,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(
        `서재 업데이트 패턴 통계 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }

  async getLibraryDiversity(
    userId: number,
    requestUserId?: number,
  ): Promise<LibraryDiversityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isLibraryDiversityPublic) {
          return {
            genreDiversityIndex: [],
            mostSpecializedLibrary: '',
            mostDiverseLibrary: '',
            isPublic: false,
          };
        }
      }

      // 서재별 장르 다양성 계산을 위한 데이터 가져오기
      try {
        const librariesData = await this.libraryRepository.find({
          where: { ownerId: userId },
          relations: [
            'libraryBooks',
            'libraryBooks.book',
            'libraryBooks.book.category',
          ],
        });

        const genreDiversityIndex = [];
        let mostSpecializedLibrary = '없음';
        let mostDiverseLibrary = '없음';

        // 가장 낮은 다양성 지수(가장 특화된 서재)와 가장 높은 다양성 지수(가장 다양한 서재)를 추적
        let lowestDiversityIndex = Infinity;
        let highestDiversityIndex = -1;

        // 각 서재별로 장르 다양성 계산
        for (const library of librariesData) {
          // 최소 5권 이상 있는 서재만 계산
          if (library.libraryBooks && library.libraryBooks.length >= 5) {
            const categoryCount = {};
            let totalBooks = 0;

            // 각 카테고리별 도서 수 계산
            library.libraryBooks.forEach((libraryBook) => {
              if (libraryBook.book && libraryBook.book.category) {
                const categoryName = libraryBook.book.category.name || '미분류';
                categoryCount[categoryName] =
                  (categoryCount[categoryName] || 0) + 1;
                totalBooks++;
              }
            });

            // 다양성 지수 계산 (심슨 다양성 지수)
            // 값이 0에 가까울수록 다양성이 높고, 1에 가까울수록 다양성이 낮음
            let sumSquaredProportions = 0;

            if (totalBooks > 0) {
              Object.values(categoryCount).forEach((count) => {
                const proportion = (count as number) / totalBooks;
                sumSquaredProportions += proportion * proportion;
              });
            }

            // 심슨 다양성 지수 계산 (1 - 합)
            // 여러 카테고리가 균등하게 분포할수록 1에 가까워짐
            const diversityIndex = 1 - sumSquaredProportions;

            // 결과에 추가
            genreDiversityIndex.push({
              library: library.name,
              index: diversityIndex,
            });

            // 최소/최대 다양성 지수 업데이트
            if (diversityIndex < lowestDiversityIndex) {
              lowestDiversityIndex = diversityIndex;
              mostSpecializedLibrary = library.name;
            }

            if (diversityIndex > highestDiversityIndex) {
              highestDiversityIndex = diversityIndex;
              mostDiverseLibrary = library.name;
            }
          }
        }

        // 다양성 지수 내림차순 정렬
        genreDiversityIndex.sort((a, b) => b.index - a.index);

        return {
          genreDiversityIndex,
          mostSpecializedLibrary,
          mostDiverseLibrary,
          isPublic: true,
        };
      } catch (error) {
        this.logger.error(
          `서재 다양성 통계 조회 중 데이터 오류: ${error.message}`,
        );
        // 오류 발생시 기본값 반환
        return {
          genreDiversityIndex: [],
          mostSpecializedLibrary: '없음',
          mostDiverseLibrary: '없음',
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`서재 다양성 통계 조회 중 오류: ${error.message}`);
      // 오류 발생시 기본값 반환
      return {
        genreDiversityIndex: [],
        mostSpecializedLibrary: '없음',
        mostDiverseLibrary: '없음',
        isPublic: true,
      };
    }
  }

  async getAmountStats(
    userId: number,
    requestUserId?: number,
  ): Promise<AmountStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isAmountStatsPublic) {
          return {
            estimatedTotalSpent: 0,
            monthlySpending: [],
            categoryPriceAverage: [],
            isPublic: false,
          };
        }
      }

      // 읽은 도서 목록 가져오기
      const readBooks = await this.readingStatusRepository
        .createQueryBuilder('status')
        .innerJoinAndSelect('status.book', 'book')
        .leftJoinAndSelect('book.category', 'category')
        .where('status.userId = :userId', { userId })
        .andWhere('status.status = :status', { status: ReadingStatusType.READ })
        .getMany();

      // 추정 총 지출액 계산
      let estimatedTotalSpent = 0;
      readBooks.forEach((status) => {
        // 판매가격이 있으면 판매가격 사용, 없으면 정가 사용
        if (status.book.priceSales) {
          estimatedTotalSpent += status.book.priceSales;
        } else if (status.book.priceStandard) {
          estimatedTotalSpent += status.book.priceStandard;
        }
      });

      // 월별 지출 계산 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlySpendingData = {};

      // 최근 12개월 동안의 각 월 이름 생성
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM 형식
        monthlySpendingData[yearMonth] = 0;
      }

      // 도서별로 완독일 기반 월별 지출 계산
      readBooks.forEach((status) => {
        if (status.finishDate) {
          const bookPrice =
            status.book.priceSales || status.book.priceStandard || 0;
          if (bookPrice > 0) {
            const finishDate = new Date(status.finishDate);
            if (finishDate >= oneYearAgo) {
              const yearMonth = finishDate.toISOString().slice(0, 7);
              if (monthlySpendingData[yearMonth] !== undefined) {
                monthlySpendingData[yearMonth] += bookPrice;
              }
            }
          }
        }
      });

      // 월별 지출 데이터를 배열로 변환
      const monthlySpending = Object.entries(monthlySpendingData)
        .map(([month, amount]) => ({
          month,
          amount: amount as number,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // 카테고리별 평균 도서 가격 계산
      const categoryPriceData = {};
      const categoryCounts = {};

      readBooks.forEach((status) => {
        const bookPrice =
          status.book.priceSales || status.book.priceStandard || 0;
        if (bookPrice > 0 && status.book.category) {
          const categoryName = status.book.category.name || '미분류';

          if (!categoryPriceData[categoryName]) {
            categoryPriceData[categoryName] = 0;
            categoryCounts[categoryName] = 0;
          }

          categoryPriceData[categoryName] += bookPrice;
          categoryCounts[categoryName]++;
        }
      });

      // 카테고리별 평균 가격 계산
      const categoryPriceAverage = Object.entries(categoryPriceData)
        .map(([category, totalPrice]) => ({
          category,
          averagePrice:
            (totalPrice as number) / (categoryCounts[category] || 1),
        }))
        .sort((a, b) => b.averagePrice - a.averagePrice);

      return {
        estimatedTotalSpent,
        monthlySpending,
        categoryPriceAverage,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`금액 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  async getSearchActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<SearchActivityResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isSearchActivityPublic) {
          return {
            searchCount: 0,
            topSearchTerms: [],
            searchPattern: '',
            isPublic: false,
          };
        }
      }

      // 검색 횟수 조회
      const searchCount = await this.searchLogRepository.count({
        where: { userId },
      });

      // 사용자의 상위 검색어 조회 (최대 5개)
      const topSearchTermsResult = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select('searchLog.term')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .groupBy('searchLog.term')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

      const topSearchTerms = topSearchTermsResult.map((item) => ({
        term: item.term,
        count: parseInt(item.count),
      }));

      // 월별 검색 패턴 분석
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlySearchCounts = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :sixMonthsAgo', { sixMonthsAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      // 검색 패턴 분석 (간단한 텍스트 설명)
      let searchPattern = '정기적으로 검색을 하고 있습니다.';

      if (searchCount === 0) {
        searchPattern = '아직 검색 활동이 없습니다.';
      } else if (monthlySearchCounts.length === 0) {
        searchPattern = '최근 6개월간 검색 활동이 없습니다.';
      } else if (monthlySearchCounts.length < 3) {
        searchPattern = '간헐적으로 검색을 사용하고 있습니다.';
      } else {
        // 최근 3개월 검색 증가/감소 추세 분석
        const recentMonths = monthlySearchCounts.slice(-3);
        if (recentMonths.length === 3) {
          const trend = this.calculateTrend(
            recentMonths.map((m) => parseInt(m.count)),
          );
          if (trend > 0.2) {
            searchPattern = '검색 사용이 점차 증가하고 있습니다.';
          } else if (trend < -0.2) {
            searchPattern = '검색 사용이 점차 감소하고 있습니다.';
          }
        }
      }

      return {
        searchCount,
        topSearchTerms,
        searchPattern,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`검색 활동 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 트렌드 계산 헬퍼 함수 (간단한 선형 기울기)
  private calculateTrend(values: number[]): number {
    if (values.length <= 1) return 0;

    // 간단한 기울기 계산 (마지막 값 - 첫 값) / 개수
    return (values[values.length - 1] - values[0]) / values.length;
  }

  async getBookMetadataStats(
    userId: number,
    requestUserId?: number,
  ): Promise<BookMetadataStatsResponseDto> {
    try {
      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isBookMetadataStatsPublic) {
          return {
            averageBookAge: 0,
            translationRatio: 0,
            publicationYearDistribution: [],
            isPublic: false,
          };
        }
      }

      // 읽은 도서 목록 가져오기
      const readBooksQuery = this.readingStatusRepository
        .createQueryBuilder('status')
        .leftJoinAndSelect('status.book', 'book')
        .where('status.userId = :userId', { userId })
        .andWhere('status.status = :status', {
          status: ReadingStatusType.READ,
        });

      const readBooks = await readBooksQuery.getMany();

      // 평균 도서 출간일로부터 경과 기간 (년)
      let totalAgeInYears = 0;
      let booksWithValidPubDate = 0;
      const currentYear = new Date().getFullYear();

      // 연도별 출판 분포 추적
      const publicationYearCount = {};

      // 번역서 vs 국내서 카운트
      let translatedBooks = 0;
      let totalBooksWithTranslatorInfo = 0;

      readBooks.forEach((status) => {
        const book = status.book;
        if (!book) return;

        // 출판 연도 분석
        if (book.publishDate) {
          const pubDate = new Date(book.publishDate);
          const pubYear = pubDate.getFullYear();

          // 출판 연도 분포 추가
          publicationYearCount[pubYear] =
            (publicationYearCount[pubYear] || 0) + 1;

          // 도서 나이 계산
          const ageInYears = currentYear - pubYear;
          totalAgeInYears += ageInYears;
          booksWithValidPubDate++;
        }

        // 번역서 여부 확인
        if (book.translator !== undefined) {
          totalBooksWithTranslatorInfo++;
          if (book.translator && book.translator.trim() !== '') {
            translatedBooks++;
          }
        }
      });

      // 평균 도서 나이 계산
      const averageBookAge =
        booksWithValidPubDate > 0 ? totalAgeInYears / booksWithValidPubDate : 0;

      // 번역서 비율 계산
      const translationRatio =
        totalBooksWithTranslatorInfo > 0
          ? (translatedBooks / totalBooksWithTranslatorInfo) * 100
          : 0;

      // 출판 연도별 분포를 배열로 변환
      const publicationYearDistribution = Object.entries(publicationYearCount)
        .map(([year, count]) => ({
          year,
          count: count as number,
        }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));

      return {
        averageBookAge,
        translationRatio,
        publicationYearDistribution,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`도서 메타데이터 통계 조회 중 오류: ${error.message}`);
      // 오류 발생시 기본값 반환
      return {
        averageBookAge: 0,
        translationRatio: 0,
        publicationYearDistribution: [],
        isPublic: true,
      };
    }
  }

  async getRecentPopularSearches(
    limit = 10,
  ): Promise<RecentPopularSearchDto[]> {
    try {
      // PopularSearch 엔티티에서 최근 인기 검색어 가져오기
      const popularSearches = await this.popularSearchRepository.find({
        order: {
          count: 'DESC',
          updatedAt: 'DESC',
        },
        take: limit,
      });

      // DTO 형식으로 변환
      return popularSearches.map((search) => ({
        term: search.term,
        count: search.count,
      }));
    } catch (error) {
      this.logger.error(`인기 검색어 조회 중 오류: ${error.message}`);
      throw error;
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

      // 날짜별 데이터 갱신
      dailyQueryResults.forEach((item) => {
        const dailyItem = dailyData.find((d) => d.date === item.date);
        if (dailyItem) {
          const count = parseInt(item.count, 10) || 0;

          if (item.status === ReadingStatusType.WANT_TO_READ) {
            dailyItem.wantToReadCount = count;
          } else if (item.status === ReadingStatusType.READING) {
            dailyItem.readingCount = count;
          } else if (item.status === ReadingStatusType.READ) {
            dailyItem.readCount = count;
          }
        }
      });

      // 일별 데이터는 항상 5개 사용
      const dailyResult = dailyData.slice(0, 5);

      // 최종 결과 반환
      return {
        yearly: yearlyResult,
        monthly: monthlyResult,
        weekly: weeklyResult,
        daily: dailyResult,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`기간별 독서 상태 통계 조회 중 오류: ${error.message}`);
      // 오류 발생시 기본값 반환
      return {
        yearly: this.generateEmptyYearlyData(),
        monthly: this.generateEmptyMonthlyData(),
        weekly: this.generateEmptyWeeklyData(),
        daily: this.generateEmptyDailyData(),
        isPublic: true,
      };
    }
  }

  // 데이터 병합 및 정렬 헬퍼 (중복 제거 포함)
  private mergeAndSortData<T>(
    emptyData: T[],
    actualData: T[],
    key: string,
    limit: number,
  ): T[] {
    if (actualData.length === 0) {
      return emptyData;
    }

    // key별로 데이터 매핑
    const dataMap = new Map<string, T>();

    // 빈 데이터 먼저 맵에 추가
    emptyData.forEach((item) => {
      dataMap.set(item[key] as string, item);
    });

    // 실제 데이터로 매핑 덮어쓰기 (더 최신 데이터이므로)
    actualData.forEach((item) => {
      dataMap.set(item[key] as string, item);
    });

    // 맵의 값을 배열로 변환하고 정렬
    const result = Array.from(dataMap.values()).sort((a, b) => {
      const aKey = a[key] as string;
      const bKey = b[key] as string;
      return aKey.localeCompare(bKey);
    });

    // 디버깅 로그 추가
    this.logger.debug(
      `mergeAndSortData - key: ${key}, emptyData: ${JSON.stringify(emptyData.map((item) => item[key]))}, actualData: ${JSON.stringify(actualData.map((item) => item[key]))}, result: ${JSON.stringify(result.map((item) => item[key]))}`,
    );

    // 데이터가 limit보다 적은 경우 모든 데이터 반환
    if (result.length <= limit) {
      return result;
    }

    // 최근 limit 개수만 반환
    return result.slice(-limit);
  }

  // 날짜 포맷 헬퍼 (YYYY-MM-DD)
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 헬퍼 메서드: 비어있는 연도별 데이터 생성
  private generateEmptyYearlyData(count = 5): {
    year: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

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

  // 헬퍼 메서드: 비어있는 월별 데이터 생성
  private generateEmptyMonthlyData(count = 5): {
    month: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const today = new Date();

    // 현재 년월 구하기
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based (0: 1월, 11: 12월)

    // 최근 count개월의 데이터 생성
    for (let i = 0; i < count; i++) {
      // count-i-1번째 이전 월 계산
      let targetMonth = currentMonth - (count - i - 1);
      let targetYear = currentYear;

      // 월이 음수인 경우 이전 연도로 조정
      while (targetMonth < 0) {
        targetYear--;
        targetMonth += 12;
      }

      // 월을 1부터 시작하는 형식으로 변환 (1월 = 1)
      const monthDisplay = String(targetMonth + 1).padStart(2, '0');

      result.push({
        month: `${targetYear}-${monthDisplay}`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 디버깅용 로그
    this.logger.debug(
      `generateEmptyMonthlyData 생성 결과: ${JSON.stringify(result)}`,
    );

    return result;
  }

  // 헬퍼 메서드: 비어있는 주간별 데이터 생성
  private generateEmptyWeeklyData(): {
    week: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);

      const endMonth = endDate.getMonth() + 1;
      const weekIndex = Math.ceil(endDate.getDate() / 7);

      result.push({
        week: `${endMonth}월 ${weekIndex}째주`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 가장 오래된 주부터 표시하기 위해 역순으로 반환
    return result.reverse().slice(0, 5); // 항상 5개만 반환
  }

  // 헬퍼 메서드: 비어있는 일별 데이터 생성
  private generateEmptyDailyData(): {
    date: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 4; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      result.push({
        date: this.formatDate(date),
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 항상 5개 반환
    return result;
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
}
