import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, Raw, Not } from 'typeorm';
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
import { StatisticsSettingResponseDto } from './dto/statistics-setting.dto';
import { UpdateStatisticsSettingDto } from './dto/statistics-setting.dto';
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
  ReviewInfluenceResponseDto,
  LibraryCompositionResponseDto,
  LibraryPopularityResponseDto,
  LibraryUpdatePatternResponseDto,
  SearchActivityResponseDto,
  RecentPopularSearchDto,
  ReadingStatusByPeriodResponseDto,
  CommunityActivityResponseDto,
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
      isCommunityActivityPublic: setting.isCommunityActivityPublic,
      isReviewInfluencePublic: setting.isReviewInfluencePublic,
      isLibraryCompositionPublic: setting.isLibraryCompositionPublic,
      isLibraryPopularityPublic: setting.isLibraryPopularityPublic,
      isLibraryUpdatePatternPublic: setting.isLibraryUpdatePatternPublic,
      isSearchActivityPublic: setting.isSearchActivityPublic,
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

  // 리뷰 빈 연도별 데이터 생성 헬퍼 메소드
  private generateEmptyYearlyReviewData(count = 5): {
    year: string;
    count: number;
  }[] {
    const result = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      result.push({
        year: (currentYear - i).toString(),
        count: 0,
      });
    }

    return result.reverse();
  }

  // 리뷰 빈 월별 데이터 생성 헬퍼 메소드
  private generateEmptyMonthlyReviewData(count = 5): {
    month: string;
    count: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (let i = 0; i < count; i++) {
      const monthIndex = currentMonth - i;
      let year = currentYear;
      let month = monthIndex;

      if (monthIndex < 0) {
        month = 12 + monthIndex;
        year = currentYear - 1;
      }

      // 월 포맷팅 (2자리 숫자로)
      const formattedMonth = (month + 1).toString().padStart(2, '0');
      result.push({
        month: `${year}-${formattedMonth}`,
        count: 0,
      });
    }

    return result.reverse();
  }

  // 리뷰 빈 주별 데이터 생성 헬퍼 메소드
  private generateEmptyWeeklyReviewData(): {
    week: string;
    count: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 자바스크립트는 0-indexed month

    // 현재 주차 계산
    const currentDate = now.getDate();
    const currentWeek = Math.ceil(currentDate / 7);

    for (let i = 0; i < 5; i++) {
      let weekNum = currentWeek - i;
      let month = currentMonth;

      if (weekNum <= 0) {
        weekNum = 4 + weekNum; // 이전 달의 주차로 계산
        month = month - 1;
        if (month <= 0) {
          month = 12; // 작년 12월
        }
      }

      result.push({
        week: `${month}월 ${weekNum}째주`,
        count: 0,
      });
    }

    return result.reverse();
  }

  // 리뷰 빈 일별 데이터 생성 헬퍼 메소드
  private generateEmptyDailyReviewData(): {
    date: string;
    count: number;
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // YYYY-MM-DD 형식으로 포맷팅
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      result.push({
        date: `${year}-${month}-${day}`,
        count: 0,
      });
    }

    return result.reverse();
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
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 'review' 타입의 리뷰만 필터링
      const reviewType = 'review';

      // 사용자의 총 리뷰 수 (review 타입만)
      const totalReviews = await this.reviewRepository.count({
        where: {
          authorId: userId,
          type: reviewType,
        },
      });

      // 월별 리뷰 작성 수 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyReviewCountsData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.type = :reviewType', { reviewType })
        .andWhere('review.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyReviewCounts = monthlyReviewCountsData.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      }));

      // 리뷰 유형별 작성 비율 (리뷰 길이에 따라 분류)
      const shortReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          type: reviewType,
          content: Raw((alias) => `LENGTH(${alias}) <= 200`),
        },
      });

      const mediumReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          type: reviewType,
          content: Raw(
            (alias) => `LENGTH(${alias}) > 200 AND LENGTH(${alias}) <= 1000`,
          ),
        },
      });

      const longReviewsCount = await this.reviewRepository.count({
        where: {
          authorId: userId,
          type: reviewType,
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
          .andWhere('review.type = :reviewType', { reviewType })
          .getRawOne();

        averageReviewLength = lengthData
          ? parseFloat(lengthData.average) || 0
          : 0;
      }

      // 빈 데이터 생성
      const emptyYearlyData = this.generateEmptyYearlyReviewData();
      const emptyMonthlyData = this.generateEmptyMonthlyReviewData();
      const emptyWeeklyData = this.generateEmptyWeeklyReviewData();
      const emptyDailyData = this.generateEmptyDailyReviewData();

      // 연도별 리뷰 통계 (최대 5년)
      const yearlyReviewData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y')", 'year')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.type = :reviewType', { reviewType })
        .groupBy('year')
        .orderBy('year', 'DESC')
        .limit(5)
        .getRawMany();

      const yearlyData = yearlyReviewData.map((item) => ({
        year: item.year,
        count: parseInt(item.count, 10),
      }));

      // 빈 데이터와 실제 데이터 병합
      const yearly = this.mergeAndSortData(
        emptyYearlyData,
        yearlyData,
        'year',
        5,
      );

      // 월별 리뷰 통계 (최근 5개월)
      const monthlyReviewData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.type = :reviewType', { reviewType })
        .groupBy('month')
        .orderBy('month', 'DESC')
        .limit(5)
        .getRawMany();

      const monthlyData = monthlyReviewData.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      }));

      // 빈 데이터와 실제 데이터 병합
      const monthly = this.mergeAndSortData(
        emptyMonthlyData,
        monthlyData,
        'month',
        5,
      );

      // 주별 리뷰 통계 (최근 5주)
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // 이번 주 일요일
      startOfWeek.setHours(0, 0, 0, 0);

      const fiveWeeksAgo = new Date(startOfWeek);
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

      const weeklyReviewData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%u')", 'yearWeek')
        .addSelect(
          "CONCAT(MONTH(review.createdAt), '월 ', FLOOR((DAY(review.createdAt) - 1) / 7) + 1, '째주')",
          'week',
        )
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.type = :reviewType', { reviewType })
        .andWhere('review.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('yearWeek, week')
        .orderBy('yearWeek', 'DESC')
        .limit(5)
        .getRawMany();

      const weeklyData = weeklyReviewData.map((item) => ({
        week: item.week,
        count: parseInt(item.count, 10),
      }));

      // 빈 데이터와 실제 데이터 병합 (주 데이터는 특수한 형식으로 처리 필요)
      const weekly = this.mergeWeeklyData(emptyWeeklyData, weeklyData, 5);

      // 일별 리뷰 통계 (최근 5일)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      fiveDaysAgo.setHours(0, 0, 0, 0);

      const dailyReviewData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(review.id)', 'count')
        .where('review.authorId = :userId', { userId })
        .andWhere('review.type = :reviewType', { reviewType })
        .andWhere('review.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
        .groupBy('date')
        .orderBy('date', 'DESC')
        .limit(5)
        .getRawMany();

      const dailyData = dailyReviewData.map((item) => ({
        date: item.date,
        count: parseInt(item.count, 10),
      }));

      // 빈 데이터와 실제 데이터 병합
      const daily = this.mergeAndSortData(emptyDailyData, dailyData, 'date', 5);

      return {
        totalReviews,
        monthlyReviewCounts,
        reviewTypeDistribution,
        averageReviewLength,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`리뷰 통계 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 주간 데이터 특별 병합 (특수한 형식의 주 정보 때문에)
  private mergeWeeklyData(
    emptyData: { week: string; count: number }[],
    actualData: { week: string; count: number }[],
    limit: number,
  ): { week: string; count: number }[] {
    // 실제 데이터가 비어있으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData;
    }

    // 각 주차별 데이터를 객체로 변환
    const dataMap = new Map();

    // 빈 데이터 먼저 맵에 등록
    emptyData.forEach((item) => {
      dataMap.set(item.week, item.count);
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      dataMap.set(item.week, item.count);
    });

    // 맵을 배열로 변환하여 반환
    const result = Array.from(dataMap).map(([week, count]) => ({
      week,
      count,
    }));

    // 주차 정보로 정렬 (최신 주 데이터가 먼저 오도록 역순 정렬)
    result.sort((a, b) => {
      const aMonth = parseInt(a.week.split('월')[0]);
      const bMonth = parseInt(b.week.split('월')[0]);

      if (aMonth !== bMonth) return bMonth - aMonth; // 월이 큰 것이 먼저 오도록

      const aWeek = parseInt(a.week.split('째주')[0].split('월 ')[1]);
      const bWeek = parseInt(b.week.split('째주')[0].split('월 ')[1]);

      return bWeek - aWeek; // 주차가 큰 것이 먼저 오도록
    });

    // 최대 limit 개수만 반환
    return result.slice(0, limit);
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
            totalCommentsCreated: 0,
            totalLikesGiven: 0,
            engagementRate: 0,
            yearlyLikesReceived: [],
            monthlyLikesReceived: [],
            weeklyLikesReceived: [],
            dailyLikesReceived: [],
            yearlyCommentsReceived: [],
            monthlyCommentsReceived: [],
            weeklyCommentsReceived: [],
            dailyCommentsReceived: [],
            yearlyCommentsCreated: [],
            monthlyCommentsCreated: [],
            weeklyCommentsCreated: [],
            dailyCommentsCreated: [],
            yearlyLikesGiven: [],
            monthlyLikesGiven: [],
            weeklyLikesGiven: [],
            dailyLikesGiven: [],
            monthlyLikes: [],
            isPublic: false,
          };
        }
      }

      try {
        // 빈 데이터 생성
        const emptyYearlyData = this.generateEmptyYearlyInteractionData();
        const emptyMonthlyData = this.generateEmptyMonthlyInteractionData();
        const emptyWeeklyData = this.generateEmptyWeeklyInteractionData();
        const emptyDailyData = this.generateEmptyDailyInteractionData();

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

        // 작성한 댓글 총계
        const totalCommentsCreated = await this.commentRepository.count({
          where: { authorId: userId },
        });

        // 준 좋아요 총계
        const totalLikesGiven = await this.reviewLikeRepository.count({
          where: { userId },
        });

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

        // 연도별 받은 좋아요 통계
        const yearlyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y')", 'year')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyLikesReceivedRaw = yearlyLikesReceivedData.map((item) => ({
          year: item.year,
          count: parseInt(item.count, 10),
        }));

        const yearlyLikesReceived = this.mergeAndSortData(
          emptyYearlyData,
          yearlyLikesReceivedRaw,
          'year',
          5,
        );

        // 월별 받은 좋아요 통계
        const monthlyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyLikesReceivedRaw = monthlyLikesReceivedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyLikesReceived = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyLikesReceivedRaw,
          'month',
          5,
        );

        // 주별 받은 좋아요 통계
        const fiveWeeksAgo = new Date();
        fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

        const weeklyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(like.createdAt), '월 ', FLOOR((DAY(like.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyLikesReceivedRaw = weeklyLikesReceivedData.map((item) => ({
          week: item.week,
          count: parseInt(item.count, 10),
        }));

        const weeklyLikesReceived = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyLikesReceivedRaw,
          5,
        );

        // 일별 받은 좋아요 통계
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0);

        const dailyLikesReceivedData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(like.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyLikesReceivedRaw = dailyLikesReceivedData.map((item) => ({
          date: item.date,
          count: parseInt(item.count, 10),
        }));

        const dailyLikesReceived = this.mergeAndSortData(
          emptyDailyData,
          dailyLikesReceivedRaw,
          'date',
          5,
        );

        // 연도별 받은 댓글 통계
        const yearlyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y')", 'year')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyCommentsReceivedRaw = yearlyCommentsReceivedData.map(
          (item) => ({
            year: item.year,
            count: parseInt(item.count, 10),
          }),
        );

        const yearlyCommentsReceived = this.mergeAndSortData(
          emptyYearlyData,
          yearlyCommentsReceivedRaw,
          'year',
          5,
        );

        // 월별 받은 댓글 통계
        const monthlyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyCommentsReceivedRaw = monthlyCommentsReceivedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyCommentsReceived = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyCommentsReceivedRaw,
          'month',
          5,
        );

        // 주별 받은 댓글 통계
        const weeklyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(comment.createdAt), '월 ', FLOOR((DAY(comment.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyCommentsReceivedRaw = weeklyCommentsReceivedData.map(
          (item) => ({
            week: item.week,
            count: parseInt(item.count, 10),
          }),
        );

        const weeklyCommentsReceived = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyCommentsReceivedRaw,
          5,
        );

        // 일별 받은 댓글 통계
        const dailyCommentsReceivedData = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(comment.id)', 'count')
          .where('review.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyCommentsReceivedRaw = dailyCommentsReceivedData.map(
          (item) => ({
            date: item.date,
            count: parseInt(item.count, 10),
          }),
        );

        const dailyCommentsReceived = this.mergeAndSortData(
          emptyDailyData,
          dailyCommentsReceivedRaw,
          'date',
          5,
        );

        // 연도별 작성한 댓글 통계
        const yearlyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y')", 'year')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyCommentsCreatedRaw = yearlyCommentsCreatedData.map(
          (item) => ({
            year: item.year,
            count: parseInt(item.count, 10),
          }),
        );

        const yearlyCommentsCreated = this.mergeAndSortData(
          emptyYearlyData,
          yearlyCommentsCreatedRaw,
          'year',
          5,
        );

        // 월별 작성한 댓글 통계
        const monthlyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyCommentsCreatedRaw = monthlyCommentsCreatedData.map(
          (item) => ({
            month: item.month,
            count: parseInt(item.count, 10),
          }),
        );

        const monthlyCommentsCreated = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyCommentsCreatedRaw,
          'month',
          5,
        );

        // 주별 작성한 댓글 통계
        const weeklyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(comment.createdAt), '월 ', FLOOR((DAY(comment.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyCommentsCreatedRaw = weeklyCommentsCreatedData.map(
          (item) => ({
            week: item.week,
            count: parseInt(item.count, 10),
          }),
        );

        const weeklyCommentsCreated = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyCommentsCreatedRaw,
          5,
        );

        // 일별 작성한 댓글 통계
        const dailyCommentsCreatedData = await this.commentRepository
          .createQueryBuilder('comment')
          .select("DATE_FORMAT(comment.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(comment.id)', 'count')
          .where('comment.authorId = :userId', { userId })
          .andWhere('comment.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyCommentsCreatedRaw = dailyCommentsCreatedData.map(
          (item) => ({
            date: item.date,
            count: parseInt(item.count, 10),
          }),
        );

        const dailyCommentsCreated = this.mergeAndSortData(
          emptyDailyData,
          dailyCommentsCreatedRaw,
          'date',
          5,
        );

        // 연도별 준 좋아요 통계
        const yearlyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y')", 'year')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .groupBy('year')
          .orderBy('year', 'DESC')
          .limit(5)
          .getRawMany();

        const yearlyLikesGivenRaw = yearlyLikesGivenData.map((item) => ({
          year: item.year,
          count: parseInt(item.count, 10),
        }));

        const yearlyLikesGiven = this.mergeAndSortData(
          emptyYearlyData,
          yearlyLikesGivenRaw,
          'year',
          5,
        );

        // 월별 준 좋아요 통계
        const monthlyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m')", 'month')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .groupBy('month')
          .orderBy('month', 'DESC')
          .limit(5)
          .getRawMany();

        const monthlyLikesGivenRaw = monthlyLikesGivenData.map((item) => ({
          month: item.month,
          count: parseInt(item.count, 10),
        }));

        const monthlyLikesGiven = this.mergeAndSortData(
          emptyMonthlyData,
          monthlyLikesGivenRaw,
          'month',
          5,
        );

        // 주별 준 좋아요 통계
        const weeklyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%u')", 'yearWeek')
          .addSelect(
            "CONCAT(MONTH(like.createdAt), '월 ', FLOOR((DAY(like.createdAt) - 1) / 7) + 1, '째주')",
            'week',
          )
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
          .groupBy('yearWeek, week')
          .orderBy('yearWeek', 'DESC')
          .limit(5)
          .getRawMany();

        const weeklyLikesGivenRaw = weeklyLikesGivenData.map((item) => ({
          week: item.week,
          count: parseInt(item.count, 10),
        }));

        const weeklyLikesGiven = this.mergeWeeklyData(
          emptyWeeklyData,
          weeklyLikesGivenRaw,
          5,
        );

        // 일별 준 좋아요 통계
        const dailyLikesGivenData = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .select("DATE_FORMAT(like.createdAt, '%Y-%m-%d')", 'date')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.userId = :userId', { userId })
          .andWhere('like.createdAt >= :fiveDaysAgo', { fiveDaysAgo })
          .groupBy('date')
          .orderBy('date', 'DESC')
          .limit(5)
          .getRawMany();

        const dailyLikesGivenRaw = dailyLikesGivenData.map((item) => ({
          date: item.date,
          count: parseInt(item.count, 10),
        }));

        const dailyLikesGiven = this.mergeAndSortData(
          emptyDailyData,
          dailyLikesGivenRaw,
          'date',
          5,
        );

        // 월별 받은 좋아요 수 (최근 12개월) - 기존 코드와 호환성 유지
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
          totalCommentsCreated,
          totalLikesGiven,
          engagementRate,
          yearlyLikesReceived,
          monthlyLikesReceived,
          weeklyLikesReceived,
          dailyLikesReceived,
          yearlyCommentsReceived,
          monthlyCommentsReceived,
          weeklyCommentsReceived,
          dailyCommentsReceived,
          yearlyCommentsCreated,
          monthlyCommentsCreated,
          weeklyCommentsCreated,
          dailyCommentsCreated,
          yearlyLikesGiven,
          monthlyLikesGiven,
          weeklyLikesGiven,
          dailyLikesGiven,
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
          totalCommentsCreated: 0,
          totalLikesGiven: 0,
          engagementRate: 0,
          yearlyLikesReceived: [],
          monthlyLikesReceived: [],
          weeklyLikesReceived: [],
          dailyLikesReceived: [],
          yearlyCommentsReceived: [],
          monthlyCommentsReceived: [],
          weeklyCommentsReceived: [],
          dailyCommentsReceived: [],
          yearlyCommentsCreated: [],
          monthlyCommentsCreated: [],
          weeklyCommentsCreated: [],
          dailyCommentsCreated: [],
          yearlyLikesGiven: [],
          monthlyLikesGiven: [],
          weeklyLikesGiven: [],
          dailyLikesGiven: [],
          monthlyLikes: [],
          isPublic: true,
        };
      }
    } catch (error) {
      this.logger.error(`사용자 상호작용 통계 조회 중 오류: ${error.message}`);
      return {
        totalLikesReceived: 0,
        totalCommentsReceived: 0,
        totalCommentsCreated: 0,
        totalLikesGiven: 0,
        engagementRate: 0,
        yearlyLikesReceived: [],
        monthlyLikesReceived: [],
        weeklyLikesReceived: [],
        dailyLikesReceived: [],
        yearlyCommentsReceived: [],
        monthlyCommentsReceived: [],
        weeklyCommentsReceived: [],
        dailyCommentsReceived: [],
        yearlyCommentsCreated: [],
        monthlyCommentsCreated: [],
        weeklyCommentsCreated: [],
        dailyCommentsCreated: [],
        yearlyLikesGiven: [],
        monthlyLikesGiven: [],
        weeklyLikesGiven: [],
        dailyLikesGiven: [],
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
      this.logger.log(
        `팔로워 통계 조회 시작: userId=${userId}, requestUserId=${requestUserId}`,
      );

      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isFollowerStatsPublic) {
          // 비공개인 경우 생성된 빈 데이터 반환
          return {
            followersCount: 0,
            followingCount: 0,
            followerGrowth: this.generateEmptyMonthlyInteractionData(5).map(
              (item) => ({
                date: item.month,
                count: 0,
              }),
            ),
            yearly: this.generateEmptyYearlyInteractionData(5),
            monthly: this.generateEmptyMonthlyInteractionData(5),
            weekly: this.generateEmptyWeeklyInteractionData(),
            daily: this.generateEmptyDailyInteractionData().slice(0, 5),
            isPublic: false,
          };
        }
      }

      // 1. 빈 데이터 준비
      const emptyYearlyData = this.generateEmptyYearlyInteractionData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyInteractionData(5);
      const emptyWeeklyData = this.generateEmptyWeeklyInteractionData();
      const emptyDailyData = this.generateEmptyDailyInteractionData().slice(
        0,
        5,
      );

      // 2. 현재 팔로워/팔로잉 수 조회
      const followers = await this.userFollowerRepository.find({
        where: { following_id: userId },
      });
      const followersCount = followers.length;
      this.logger.log(`팔로워 수: ${followersCount}`);

      const following = await this.userFollowerRepository.find({
        where: { follower_id: userId },
      });
      const followingCount = following.length;
      this.logger.log(`팔로잉 수: ${followingCount}`);

      // 3. 기간 설정
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 = 35일

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 4. 연도별 팔로워 데이터 (최근 5년) 조회
      const yearlyDataQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y') as year, 
          COUNT(id) as count 
        FROM 
          user_follower 
        WHERE 
          following_id = ? 
          AND created_at >= ? 
        GROUP BY 
          year 
        ORDER BY 
          year DESC
        LIMIT 5
      `;

      const yearlyData = await this.userFollowerRepository.query(
        yearlyDataQuery,
        [userId, fiveYearsAgo],
      );

      this.logger.log(
        `연도별 팔로워 데이터 결과: ${JSON.stringify(yearlyData)}`,
      );

      // 5. 월별 팔로워 데이터 (최근 5개월) 조회
      const monthlyDataQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month, 
          COUNT(id) as count 
        FROM 
          user_follower 
        WHERE 
          following_id = ? 
          AND created_at >= ? 
        GROUP BY 
          month 
        ORDER BY 
          month DESC
        LIMIT 5
      `;

      const monthlyData = await this.userFollowerRepository.query(
        monthlyDataQuery,
        [userId, oneYearAgo],
      );

      this.logger.log(
        `월별 팔로워 데이터 결과: ${JSON.stringify(monthlyData)}`,
      );

      // 6. 주별 팔로워 데이터 (최근 5주) 조회
      const weeklyDataQuery = `
        SELECT 
          CONCAT(YEAR(created_at), '-', WEEK(created_at)) as yearWeek,
          CONCAT(MONTH(created_at), '월 ', FLOOR((DAY(created_at) - 1) / 7) + 1, '째주') as week,
          COUNT(id) as count 
        FROM 
          user_follower 
        WHERE 
          following_id = ? 
          AND created_at >= ? 
        GROUP BY 
          yearWeek, week
        ORDER BY 
          yearWeek DESC
        LIMIT 5
      `;

      const weeklyData = await this.userFollowerRepository.query(
        weeklyDataQuery,
        [userId, fiveWeeksAgo],
      );

      this.logger.log(`주별 팔로워 데이터 결과: ${JSON.stringify(weeklyData)}`);

      // 7. 일별 팔로워 데이터 (최근 5일) 조회
      const dailyDataQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d') as date, 
          COUNT(id) as count 
        FROM 
          user_follower 
        WHERE 
          following_id = ? 
          AND created_at >= ? 
        GROUP BY 
          date 
        ORDER BY 
          date DESC
        LIMIT 5
      `;

      const dailyData = await this.userFollowerRepository.query(
        dailyDataQuery,
        [userId, thirtyDaysAgo],
      );

      this.logger.log(`일별 팔로워 데이터 결과: ${JSON.stringify(dailyData)}`);

      // 8. 실제 데이터 형식 변환
      const formattedYearlyData = yearlyData.map((item) => ({
        year: item.year,
        count: parseInt(item.count, 10) || 0,
      }));

      const formattedMonthlyData = monthlyData.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10) || 0,
      }));

      const formattedWeeklyData = weeklyData.map((item) => ({
        week: item.week,
        count: parseInt(item.count, 10) || 0,
      }));

      const formattedDailyData = dailyData.map((item) => ({
        date: item.date,
        count: parseInt(item.count, 10) || 0,
      }));

      // 9. 빈 데이터와 실제 데이터 병합
      // 연도별 데이터
      let yearly = this.mergeAndSortData(
        emptyYearlyData,
        formattedYearlyData,
        'year',
        5,
      );

      // 월별 데이터
      let monthly = this.mergeAndSortData(
        emptyMonthlyData,
        formattedMonthlyData,
        'month',
        5,
      );

      // 주별 데이터
      let weekly = this.mergeWeeklyData(
        emptyWeeklyData,
        formattedWeeklyData,
        5,
      );

      // 일별 데이터
      let daily = this.mergeAndSortData(
        emptyDailyData,
        formattedDailyData,
        'date',
        5,
      );

      // 최신 데이터부터 정렬
      yearly = yearly.reverse();
      monthly = monthly.reverse();
      daily = daily.reverse();

      // 10. followerGrowth 필드 생성 (월별 데이터 기반)
      const followerGrowth = monthly.map((item) => ({
        date: item.month,
        count: item.count,
      }));

      this.logger.log(`팔로워 통계 조회 완료: 
        followersCount=${followersCount}, 
        followingCount=${followingCount}`);

      return {
        followersCount,
        followingCount,
        followerGrowth,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`팔로워 통계 조회 중 오류: ${error.message}`);
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
        // 리뷰당 평균 좋아요 수 ('review' 타입 제외)
        const likesData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('AVG(review.likeCount)', 'average')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .getRawOne();

        const averageLikesPerReview = likesData
          ? parseFloat(likesData.average) || 0
          : 0;

        // 가장 인기 있는 리뷰 TOP 5 ('review' 타입 제외)
        const popularReviewsData = await this.reviewRepository
          .createQueryBuilder('review')
          .select('review.id', 'id')
          .addSelect('SUBSTRING(review.content, 1, 100)', 'content')
          .addSelect('review.likeCount', 'likes')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
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

        // 커뮤니티 기여도 점수 (리뷰 수 + 받은 좋아요 수 + 받은 댓글 수) ('review' 타입 제외)
        const totalReviews = await this.reviewRepository.count({
          where: {
            authorId: userId,
            type: Not('review'),
          },
        });

        const totalLikes = await this.reviewLikeRepository
          .createQueryBuilder('like')
          .leftJoin('like.review', 'review')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
          .getCount();

        const totalComments = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoin('comment.review', 'review')
          .where('review.authorId = :userId', { userId })
          .andWhere('review.type != :reviewType', { reviewType: 'review' })
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
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
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

      this.logger.debug(
        `서재별 구독자 수: ${JSON.stringify(subscribersPerLibrary)}`,
      );

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

      this.logger.debug(
        `서재 인기도 추이 데이터: ${JSON.stringify(librariesPopularityData)}`,
      );

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

      // 기간별 구독자 추세 데이터 조회
      // 1. 빈 데이터 준비
      const emptyYearlyData = this.generateEmptyYearlySubscriptionData(5);
      const emptyMonthlyData = this.generateEmptyMonthlySubscriptionData(5);
      const emptyWeeklyData = this.generateEmptyWeeklySubscriptionData();
      const emptyDailyData = this.generateEmptySubscriptionData(5);

      this.logger.debug(`빈 데이터 템플릿:
        연도별: ${JSON.stringify(emptyYearlyData)},
        월별: ${JSON.stringify(emptyMonthlyData)},
        주별: ${JSON.stringify(emptyWeeklyData)},
        일별: ${JSON.stringify(emptyDailyData)}
      `);

      // 3. 사용자의 서재 목록 가져오기
      const userLibraries = await this.libraryRepository.find({
        where: { ownerId: userId },
        select: ['id', 'name'],
      });

      const libraryIds = userLibraries.map((lib) => lib.id);
      const libraryNameMap = {};
      userLibraries.forEach((lib) => {
        libraryNameMap[lib.id] = lib.name;
      });

      this.logger.debug(`사용자 서재 목록: ${JSON.stringify(userLibraries)}`);

      // 최근 구독 데이터만 가져오기 - 시간 제약 없이
      const subscriptionData = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select('library.id', 'libraryId')
        .addSelect('library.name', 'libraryName')
        .addSelect('subscription.createdAt', 'createdAt')
        .where('library.ownerId = :userId', { userId })
        .orderBy('subscription.createdAt', 'DESC')
        .getRawMany();

      this.logger.debug(`구독 데이터: ${JSON.stringify(subscriptionData)}`);

      // Top 구독자 서재 목록 (최대 5개)
      const topLibraries = subscribersPerLibrary
        .filter((lib) => lib.subscribers > 0)
        .slice(0, 5)
        .map((lib) => ({
          library: lib.library,
          subscribers: lib.subscribers,
        }));

      if (topLibraries.length === 0 && subscribersPerLibrary.length > 0) {
        // 구독자가 0이어도 최소 몇 개는 표시
        topLibraries.push(
          ...subscribersPerLibrary.slice(0, 5).map((lib) => ({
            library: lib.library,
            subscribers: lib.subscribers,
          })),
        );
      }

      this.logger.debug(`상위 서재 목록: ${JSON.stringify(topLibraries)}`);

      // 3. 연도별 구독자 데이터 조회 - 데이터가 있는 행만
      const yearlyData = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select("DATE_FORMAT(subscription.createdAt, '%Y')", 'year')
        .addSelect('library.id', 'libraryId')
        .addSelect('COUNT(subscription.id)', 'subscribers')
        .where('library.ownerId = :userId', { userId })
        .groupBy('year')
        .addGroupBy('library.id')
        .orderBy('year', 'ASC')
        .getRawMany();

      // 연도별 데이터 처리
      interface YearData {
        year: string;
        libraryStats: Array<{
          libraryId: number;
          library: string;
          subscribers: number;
        }>;
        libraries: Array<{
          library: string;
          subscribers: number;
        }>;
      }

      const yearlyMap = new Map<string, YearData>();

      // 먼저 모든 빈 연도에 대해 맵 초기화
      emptyYearlyData.forEach((emptyItem) => {
        yearlyMap.set(emptyItem.year, {
          year: emptyItem.year,
          libraryStats: [],
          libraries: [],
        });
      });

      // 실제 데이터로 채우기
      yearlyData.forEach((item) => {
        const year = item.year;
        const libraryId = item.libraryId;
        const subscribers = parseInt(item.subscribers, 10) || 0;

        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, {
            year,
            libraryStats: [],
            libraries: [],
          });
        }

        const yearData = yearlyMap.get(year);
        yearData.libraryStats.push({
          libraryId,
          library: libraryNameMap[libraryId] || `서재 ${libraryId}`,
          subscribers,
        });
      });

      // 각 연도별 상위 5개 서재 선택
      for (const [year, data] of yearlyMap.entries()) {
        if (data.libraryStats.length > 0) {
          data.libraryStats.sort((a, b) => b.subscribers - a.subscribers);
          data.libraries = data.libraryStats.slice(0, 5).map((stat) => ({
            library: stat.library,
            subscribers: stat.subscribers,
          }));
        } else {
          // 데이터가 없으면 가장 인기 있는 서재 데이터 사용
          data.libraries = [...topLibraries];
        }
      }

      // 연도별 결과 생성
      const yearlyResult = Array.from(yearlyMap.values()).sort((a, b) => {
        return parseInt(a.year) - parseInt(b.year); // 오름차순 정렬
      });

      // 4. 월별 구독자 데이터 조회
      const monthlyData = await this.librarySubscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.library', 'library')
        .select("DATE_FORMAT(subscription.createdAt, '%Y-%m')", 'month')
        .addSelect('library.id', 'libraryId')
        .addSelect('COUNT(subscription.id)', 'subscribers')
        .where('library.ownerId = :userId', { userId })
        .groupBy('month')
        .addGroupBy('library.id')
        .orderBy('month', 'ASC')
        .getRawMany();

      // 월별 데이터 처리
      interface MonthData {
        month: string;
        libraryStats: Array<{
          libraryId: number;
          library: string;
          subscribers: number;
        }>;
        libraries: Array<{
          library: string;
          subscribers: number;
        }>;
      }

      const monthlyMap = new Map<string, MonthData>();

      // 먼저 모든 빈 월에 대해 맵 초기화
      emptyMonthlyData.forEach((emptyItem) => {
        monthlyMap.set(emptyItem.month, {
          month: emptyItem.month,
          libraryStats: [],
          libraries: [],
        });
      });

      // 실제 데이터로 채우기
      monthlyData.forEach((item) => {
        const month = item.month;
        const libraryId = item.libraryId;
        const subscribers = parseInt(item.subscribers, 10) || 0;

        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            libraryStats: [],
            libraries: [],
          });
        }

        const monthData = monthlyMap.get(month);
        monthData.libraryStats.push({
          libraryId,
          library: libraryNameMap[libraryId] || `서재 ${libraryId}`,
          subscribers,
        });
      });

      // 각 월별 상위 5개 서재 선택
      for (const [month, data] of monthlyMap.entries()) {
        if (data.libraryStats.length > 0) {
          data.libraryStats.sort((a, b) => b.subscribers - a.subscribers);
          data.libraries = data.libraryStats.slice(0, 5).map((stat) => ({
            library: stat.library,
            subscribers: stat.subscribers,
          }));
        } else {
          // 데이터가 없으면 가장 인기 있는 서재 데이터 사용
          data.libraries = [...topLibraries];
        }
      }

      // 월별 결과 생성
      const monthlyResult = Array.from(monthlyMap.values()).sort((a, b) => {
        return a.month.localeCompare(b.month); // 오름차순 정렬
      });

      // 주간별 데이터 처리
      const weeklyResult = emptyWeeklyData.map((item) => {
        return {
          week: item.week,
          libraries:
            item.libraries.length > 0 ? item.libraries : [...topLibraries],
        };
      });

      // 일별 데이터 처리
      const dailyResult = emptyDailyData.map((item) => {
        return {
          date: item.date,
          libraries:
            item.libraries.length > 0 ? item.libraries : [...topLibraries],
        };
      });

      // 최종 결과 로그
      this.logger.debug(`최종 결과:
        연도별: ${JSON.stringify(yearlyResult)},
        월별: ${JSON.stringify(monthlyResult)},
        주별: ${JSON.stringify(weeklyResult)},
        일별: ${JSON.stringify(dailyResult)}
      `);

      // 최종 결과 반환
      return {
        subscribersPerLibrary,
        mostPopularLibrary,
        popularityTrend,
        yearly: yearlyResult,
        monthly: monthlyResult,
        weekly: weeklyResult,
        daily: dailyResult,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`서재 인기도 통계 조회 중 오류: ${error.message}`);
      this.logger.error(error.stack);

      // 오류 발생 시 기본값 반환
      return {
        subscribersPerLibrary: [],
        mostPopularLibrary: '',
        popularityTrend: [],
        yearly: this.generateEmptyYearlySubscriptionData(5),
        monthly: this.generateEmptyMonthlySubscriptionData(5),
        weekly: this.generateEmptyWeeklySubscriptionData(),
        daily: this.generateEmptySubscriptionData(5),
        isPublic: true,
      };
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
            frequentlySearchedTerms: [],
            searchPattern: '',
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
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

      // 자주 검색하는 키워드 조회 (최대 10개)
      const frequentlySearchedTermsResult = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select('searchLog.term')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .groupBy('searchLog.term')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      // 디버깅용 로그 추가
      this.logger.debug(
        `frequentlySearchedTermsResult: ${JSON.stringify(frequentlySearchedTermsResult)}`,
      );

      const frequentlySearchedTerms = frequentlySearchedTermsResult.map(
        (item) => ({
          term: item.searchLog_term, // term 필드 이름 수정 (RawMany 결과값에 맞게)
          count: parseInt(item.count),
        }),
      );

      // 디버깅용 로그 추가
      this.logger.debug(
        `frequentlySearchedTerms: ${JSON.stringify(frequentlySearchedTerms)}`,
      );

      // 기간 설정
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 전

      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      // 1. 연도별 검색 통계
      const yearlyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y')", 'year')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :fiveYearsAgo', { fiveYearsAgo })
        .groupBy('year')
        .orderBy('year', 'ASC')
        .getRawMany();

      const yearlyResult = this.mergeAndSortData(
        this.generateEmptyYearlySearchData(),
        yearlyData.map((item) => ({
          year: item.year,
          count: parseInt(item.count),
        })),
        'year',
        5,
      );

      // 2. 월별 검색 통계
      const monthlyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();

      const monthlyResult = this.mergeAndSortData(
        this.generateEmptyMonthlySearchData(),
        monthlyData.map((item) => ({
          month: item.month,
          count: parseInt(item.count),
        })),
        'month',
        12,
      );

      // 3. 주별 검색 통계
      const weeklyEmptyData = this.generateEmptyWeeklySearchData();

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

      const weeklyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      const weeklyDataMap = new Map();
      // weeklyEmptyData 초기화
      weeklyEmptyData.forEach((week, index) => {
        weeklyDataMap.set(week.week, { week: week.week, count: 0 });
      });

      // 날짜별 데이터를 주차에 할당
      weeklyData.forEach((item) => {
        const itemDate = new Date(item.date);

        // 어떤 주차 범위에 속하는지 확인
        for (let i = 0; i < weekRanges.length; i++) {
          const range = weekRanges[i];
          if (itemDate >= range.start && itemDate <= range.end) {
            const count = parseInt(item.count) || 0;
            const reversedIndex = 4 - i; // 인덱스를 반대로 처리
            const week = weeklyEmptyData[reversedIndex].week;

            const current = weeklyDataMap.get(week);
            if (current) {
              current.count += count;
              weeklyDataMap.set(week, current);
            }
            break;
          }
        }
      });

      const weeklyResult = Array.from(weeklyDataMap.values());

      // 4. 일별 검색 통계
      const dailyData = await this.searchLogRepository
        .createQueryBuilder('searchLog')
        .select("DATE_FORMAT(searchLog.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(searchLog.id)', 'count')
        .where('searchLog.userId = :userId', { userId })
        .andWhere('searchLog.createdAt >= :oneMonthAgo', { oneMonthAgo })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

      const dailyResult = this.mergeAndSortData(
        this.generateEmptyDailySearchData(),
        dailyData.map((item) => ({
          date: item.date,
          count: parseInt(item.count),
        })),
        'date',
        30,
      );

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
        frequentlySearchedTerms,
        searchPattern,
        yearly: yearlyResult,
        monthly: monthlyResult,
        weekly: weeklyResult,
        daily: dailyResult,
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
    // 빈 데이터와 실제 데이터 맵 생성
    const dataMap: Record<string, T> = {};
    emptyData.forEach((item) => {
      dataMap[item[key]] = { ...item };
    });

    // 실제 데이터 병합
    actualData.forEach((item) => {
      if (dataMap[item[key]]) {
        dataMap[item[key]] = { ...dataMap[item[key]], ...item };
      } else {
        dataMap[item[key]] = { ...item };
      }
    });

    // 키 기준 정렬하고 최근 limit개만 반환
    return Object.values(dataMap)
      .sort((a, b) => (a[key] < b[key] ? -1 : 1))
      .slice(-limit);
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

  // 사용자 상호작용 빈 연도별 데이터 생성 헬퍼 메소드
  private generateEmptyYearlyInteractionData(count = 5): {
    year: string;
    count: number;
  }[] {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = 0; i < count; i++) {
      const year = (currentYear - count + 1 + i).toString();
      years.push({
        year,
        count: 0,
      });
    }

    return years;
  }

  private generateEmptyMonthlyInteractionData(count = 12): {
    month: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - count + 1 + i);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      result.push({
        month,
        count: 0,
      });
    }

    return result;
  }

  private generateEmptyWeeklyInteractionData(): {
    week: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 가장 최근 5주 데이터 생성
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      // 최근 주부터 역순으로 계산 (0주 전, 1주 전, ...)
      date.setDate(date.getDate() - i * 7);

      const month = date.getMonth() + 1;
      const weekOfMonth = Math.ceil(date.getDate() / 7);

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        count: 0,
      });
    }

    // 가장 최근 주부터 보여주기 위해 역순 정렬
    return result.reverse();
  }

  private generateEmptyDailyInteractionData(): {
    date: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 30일 전부터 현재까지
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - 29 + i);

      result.push({
        date: this.formatDate(date),
        count: 0,
      });
    }

    return result;
  }

  async getCommunityActivity(
    userId: number,
    requestUserId?: number,
  ): Promise<CommunityActivityResponseDto> {
    try {
      this.logger.log(
        `커뮤니티 활동 통계 조회 시작: userId=${userId}, requestUserId=${requestUserId}`,
      );

      // 설정 확인 - 다른 사용자가 요청한 경우 공개 설정 확인
      if (requestUserId !== userId) {
        const setting = await this.getOrCreateUserStatisticsSetting(userId);
        if (!setting.isCommunityActivityPublic) {
          return {
            totalReviews: 0,
            yearly: [],
            monthly: [],
            weekly: [],
            daily: [],
            isPublic: false,
          };
        }
      }

      // 작성한 총 리뷰 수
      const totalReviews = await this.reviewRepository.count({
        where: { authorId: userId },
      });

      this.logger.log(`총 리뷰 개수: ${totalReviews}`);

      // 연도별 리뷰 타입별 데이터 (최근 5년)
      const yearlyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y')", 'year')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .groupBy('year')
        .orderBy('year', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`연도별 리뷰 데이터: ${JSON.stringify(yearlyData)}`);

      // 월별 리뷰 타입별 데이터 (최근 12개월)
      const oneYearAgo = new Date();
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

      const monthlyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m')", 'month')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :oneYearAgo', { oneYearAgo })
        .groupBy('month')
        .orderBy('month', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`월별 리뷰 데이터: ${JSON.stringify(monthlyData)}`);

      // 주별 리뷰 타입별 데이터 (최근 5주)
      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35); // 5주 = 35일

      const weeklyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select(
          "CONCAT(YEAR(review.createdAt), '-', WEEK(review.createdAt))",
          'yearWeek',
        )
        .addSelect(
          "CONCAT(MONTH(review.createdAt), '월 ', FLOOR((DAY(review.createdAt) - 1) / 7) + 1, '째주')",
          'week',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :fiveWeeksAgo', { fiveWeeksAgo })
        .groupBy('yearWeek, week')
        .orderBy('yearWeek', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`주별 리뷰 데이터: ${JSON.stringify(weeklyData)}`);

      // 일별 리뷰 타입별 데이터 (최근 5일)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailyData = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE_FORMAT(review.createdAt, '%Y-%m-%d')", 'date')
        .addSelect(
          "SUM(CASE WHEN review.type = 'general' THEN 1 ELSE 0 END)",
          'general',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'discussion' THEN 1 ELSE 0 END)",
          'discussion',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'question' THEN 1 ELSE 0 END)",
          'question',
        )
        .addSelect(
          "SUM(CASE WHEN review.type = 'meetup' THEN 1 ELSE 0 END)",
          'meetup',
        )
        .where('review.authorId = :userId', { userId })
        .andWhere('review.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
        .groupBy('date')
        .orderBy('date', 'DESC')
        .limit(5)
        .getRawMany();

      this.logger.log(`일별 리뷰 데이터: ${JSON.stringify(dailyData)}`);

      // 빈 데이터 생성
      const emptyYearlyData = this.generateEmptyYearlyCommunityData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyCommunityData(5);
      const emptyWeeklyData = this.generateEmptyWeeklyCommunityData().slice(
        0,
        5,
      );
      const emptyDailyData = this.generateEmptyDailyCommunityData().slice(0, 5);

      // 데이터가 전혀 없는 경우 빈 배열 넣기
      if (totalReviews === 0) {
        return {
          totalReviews: 0,
          yearly: emptyYearlyData.slice(0, 5),
          monthly: emptyMonthlyData.slice(0, 5),
          weekly: emptyWeeklyData.slice(0, 5),
          daily: emptyDailyData.slice(0, 5),
          isPublic: true,
        };
      }

      // 실제 데이터 형식 변환 및 숫자로 변환
      const formattedYearlyData = yearlyData.map((item) => ({
        year: item.year,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedMonthlyData = monthlyData.map((item) => ({
        month: item.month,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedWeeklyData = weeklyData.map((item) => ({
        week: item.week,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      const formattedDailyData = dailyData.map((item) => ({
        date: item.date,
        general: parseInt(item.general, 10) || 0,
        discussion: parseInt(item.discussion, 10) || 0,
        question: parseInt(item.question, 10) || 0,
        meetup: parseInt(item.meetup, 10) || 0,
      }));

      // 실제 데이터가 있는지 확인
      this.logger.log(`정리된 데이터: 
        연도별: ${JSON.stringify(formattedYearlyData)}, 
        월별: ${JSON.stringify(formattedMonthlyData)}, 
        주별: ${JSON.stringify(formattedWeeklyData)}, 
        일별: ${JSON.stringify(formattedDailyData)}`);

      // 빈 데이터와 실제 데이터 병합 (커스텀 병합 함수 필요)
      let yearly = this.mergeAndSortCommunityData(
        emptyYearlyData,
        formattedYearlyData,
        'year',
        5,
      );

      let monthly = this.mergeAndSortCommunityData(
        emptyMonthlyData,
        formattedMonthlyData,
        'month',
        5,
      );

      let weekly = this.mergeWeeklyCommunityData(
        emptyWeeklyData,
        formattedWeeklyData,
        5,
      );

      let daily = this.mergeAndSortCommunityData(
        emptyDailyData,
        formattedDailyData,
        'date',
        5,
      );

      // 최신 데이터부터 나오도록 역순 정렬
      yearly = yearly.reverse();
      monthly = monthly.reverse();
      daily = daily.reverse();

      // 데이터 개수 제한
      yearly = yearly.slice(0, 5);
      monthly = monthly.slice(0, 5);
      weekly = weekly.slice(0, 5);
      daily = daily.slice(0, 5);

      // 병합 결과 로깅
      this.logger.log(`병합된 데이터:
        연도별: ${JSON.stringify(yearly)},
        월별: ${JSON.stringify(monthly)},
        주별: ${JSON.stringify(weekly)},
        일별: ${JSON.stringify(daily)}`);

      return {
        totalReviews,
        yearly,
        monthly,
        weekly,
        daily,
        isPublic: true,
      };
    } catch (error) {
      this.logger.error(`커뮤니티 활동 통계 조회 중 오류: ${error.message}`);
      this.logger.error(error.stack);

      // 오류 발생 시 기본값 반환 대신 빈 데이터 생성해서 반환
      const emptyYearlyData = this.generateEmptyYearlyCommunityData(5);
      const emptyMonthlyData = this.generateEmptyMonthlyCommunityData(5).slice(
        0,
        5,
      );
      const emptyWeeklyData = this.generateEmptyWeeklyCommunityData().slice(
        0,
        5,
      );
      const emptyDailyData = this.generateEmptyDailyCommunityData().slice(0, 5);

      return {
        totalReviews: 0,
        yearly: emptyYearlyData,
        monthly: emptyMonthlyData,
        weekly: emptyWeeklyData,
        daily: emptyDailyData,
        isPublic: true,
      };
    }
  }

  private generateEmptyYearlyCommunityData(count = 5): {
    year: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      result.push({
        year: String(currentYear - i),
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  private generateEmptyMonthlyCommunityData(count = 5): {
    month: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based를 1-based로 변환

    for (let i = 0; i < count; i++) {
      let year = currentYear;
      let month = currentMonth - i;

      // 이전 년도로 넘어가는 경우
      while (month <= 0) {
        year--;
        month += 12;
      }

      // 월 포맷 (YY-MM)
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      result.push({
        month: `${year}-${monthStr}`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  private generateEmptyWeeklyCommunityData(): {
    week: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 0-based to 1-based

    // 현재 날짜 기준으로 이번 주가 몇 번째 주인지 계산
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);

    // 지난 5주의 '월 n째주' 형식 데이터 생성
    for (let i = 0; i < 5; i++) {
      let month = currentMonth;
      let weekOfMonth = currentWeekOfMonth - i;

      // 전월로 넘어가는 경우
      while (weekOfMonth <= 0) {
        month = month - 1;
        if (month <= 0) {
          month = 12;
        }
        // 한 달에 대략 4주로 가정
        weekOfMonth = 4 + weekOfMonth;
      }

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  private generateEmptyDailyCommunityData(): {
    date: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    const result = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dayStr = day < 10 ? `0${day}` : `${day}`;

      result.push({
        date: `${year}-${monthStr}-${dayStr}`,
        general: 0,
        discussion: 0,
        question: 0,
        meetup: 0,
      });
    }

    return result;
  }

  private mergeAndSortCommunityData(
    emptyData: any[],
    actualData: any[],
    keyField: string,
    limit: number,
  ): any[] {
    // 실제 데이터가 없으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData.slice(0, limit);
    }

    // keyField 값을 기준으로 데이터 맵 생성
    const dataMap = new Map();

    // 빈 데이터를 먼저 맵에 추가
    emptyData.forEach((item) => {
      dataMap.set(item[keyField], { ...item });
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      if (dataMap.has(item[keyField])) {
        const existingItem = dataMap.get(item[keyField]);
        dataMap.set(item[keyField], {
          ...existingItem,
          general: item.general,
          discussion: item.discussion,
          question: item.question,
          meetup: item.meetup,
        });
      } else {
        dataMap.set(item[keyField], { ...item });
      }
    });

    // 맵을 배열로 변환
    const result = Array.from(dataMap.values());

    // keyField 값으로 정렬 (내림차순: 최신 데이터가 먼저)
    result.sort((a, b) => {
      if (a[keyField] > b[keyField]) return -1;
      if (a[keyField] < b[keyField]) return 1;
      return 0;
    });

    // 데이터 개수 제한
    return result.slice(0, limit);
  }

  private mergeWeeklyCommunityData(
    emptyData: {
      week: string;
      general: number;
      discussion: number;
      question: number;
      meetup: number;
    }[],
    actualData: {
      week: string;
      general: number;
      discussion: number;
      question: number;
      meetup: number;
    }[],
    limit: number,
  ): {
    week: string;
    general: number;
    discussion: number;
    question: number;
    meetup: number;
  }[] {
    // 빈 데이터와 실제 데이터 맵 생성
    const dataMap: Record<string, any> = {};
    emptyData.forEach((item) => {
      dataMap[item.week] = { ...item };
    });

    // 실제 데이터 병합
    actualData.forEach((item) => {
      if (dataMap[item.week]) {
        dataMap[item.week] = {
          ...dataMap[item.week],
          general: item.general,
          discussion: item.discussion,
          question: item.question,
          meetup: item.meetup,
        };
      } else {
        dataMap[item.week] = { ...item };
      }
    });

    // 맵을 배열로 변환
    const result = Object.values(dataMap);

    // 주차 정보로 정렬 (최신 주 데이터가 먼저 오도록 역순 정렬)
    result.sort((a, b) => {
      const aMonth = parseInt(a.week.split('월')[0]);
      const bMonth = parseInt(b.week.split('월')[0]);

      // 월이 다르면 월로 정렬
      if (aMonth !== bMonth) {
        return bMonth - aMonth; // 내림차순 (최신 월이 먼저)
      }

      // 월이 같으면 주차로 정렬
      const aWeek = parseInt(a.week.split('째주')[0].split('월 ')[1]);
      const bWeek = parseInt(b.week.split('째주')[0].split('월 ')[1]);
      return bWeek - aWeek; // 내림차순 (최신 주차가 먼저)
    });

    // 데이터 개수 제한
    return result.slice(0, limit);
  }

  private generateEmptySubscriptionData(count = 5): {
    date: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const result = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      result.push({
        date: this.formatDate(date),
        libraries: [],
      });
    }

    return result.reverse();
  }

  private generateEmptyYearlySubscriptionData(count = 5): {
    year: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const result = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      result.push({
        year: String(currentYear - i),
        libraries: [],
      });
    }

    return result.reverse();
  }

  private generateEmptyMonthlySubscriptionData(count = 5): {
    month: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const result = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based를 1-based로 변환

    for (let i = 0; i < count; i++) {
      let year = currentYear;
      let month = currentMonth - i;

      // 이전 년도로 넘어가는 경우
      while (month <= 0) {
        year--;
        month += 12;
      }

      // 월 포맷 (YYYY-MM)
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      result.push({
        month: `${year}-${monthStr}`,
        libraries: [],
      });
    }

    return result.reverse();
  }

  private generateEmptyWeeklySubscriptionData(): {
    week: string;
    libraries: { library: string; subscribers: number }[];
  }[] {
    const result = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 0-based to 1-based

    // 현재 날짜 기준으로 이번 주가 몇 번째 주인지 계산
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);

    // 지난 5주의 '월 n째주' 형식 데이터 생성
    for (let i = 0; i < 5; i++) {
      let month = currentMonth;
      let weekOfMonth = currentWeekOfMonth - i;

      // 전월로 넘어가는 경우
      while (weekOfMonth <= 0) {
        month = month - 1;
        if (month <= 0) {
          month = 12;
        }
        // 한 달에 대략 4주로 가정
        weekOfMonth = 4 + weekOfMonth;
      }

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        libraries: [],
      });
    }

    return result.reverse();
  }

  // Empty search data helper methods
  private generateEmptyYearlySearchData(count = 5): {
    year: string;
    count: number;
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

    for (let i = 0; i < count; i++) {
      const year = (currentYear - count + 1 + i).toString();
      result.push({
        year,
        count: 0,
      });
    }

    return result;
  }

  private generateEmptyMonthlySearchData(count = 12): {
    month: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - count + 1 + i);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      result.push({
        month,
        count: 0,
      });
    }

    return result;
  }

  private generateEmptyWeeklySearchData(): {
    week: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 가장 최근 5주 데이터 생성
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      // 최근 주부터 역순으로 계산 (0주 전, 1주 전, ...)
      date.setDate(date.getDate() - i * 7);

      const month = date.getMonth() + 1;
      const weekOfMonth = Math.ceil(date.getDate() / 7);

      result.push({
        week: `${month}월 ${weekOfMonth}째주`,
        count: 0,
      });
    }

    // 가장 최근 주부터 보여주기 위해 역순 정렬
    return result.reverse();
  }

  private generateEmptyDailySearchData(): {
    date: string;
    count: number;
  }[] {
    const today = new Date();
    const result = [];

    // 30일 전부터 현재까지
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - 29 + i);

      result.push({
        date: this.formatDate(date),
        count: 0,
      });
    }

    return result;
  }
}
