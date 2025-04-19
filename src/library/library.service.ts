import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryTag } from '../library-tag/entities/library-tag.entity';
import { LibraryTagMapping } from './entities/library-tag-mapping.entity';
import { LibrarySubscription } from './entities/library-subscription.entity';
import {
  LibraryUpdateHistory,
  LibraryActivityType,
} from './entities/library-update-history.entity';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { AddBookToLibraryDto } from './dto/add-book-to-library.dto';
import { AddBooksToLibraryDto } from './dto/add-books-to-library.dto';
import { AddTagToLibraryDto } from './dto/add-tag-to-library.dto';
import { BookService } from '../book/book.service';
import {
  LibraryResponseDto,
  LibraryListResponseDto,
  LibraryBookResponseDto,
  LibraryTagResponseDto,
  SubscriberResponseDto,
  LibraryDetailResponseDto,
  UpdateHistoryItem,
  LibrarySortOption,
  PaginatedLibraryResponse,
} from './dto/library-response.dto';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { Brackets } from 'typeorm';
import { LibraryTagService } from '../library-tag/library-tag.service';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(Library)
    private readonly libraryRepository: Repository<Library>,
    @InjectRepository(LibraryBook)
    private readonly libraryBookRepository: Repository<LibraryBook>,
    @InjectRepository(LibraryTag)
    private readonly libraryTagRepository: Repository<LibraryTag>,
    @InjectRepository(LibraryTagMapping)
    private readonly libraryTagMappingRepository: Repository<LibraryTagMapping>,
    @InjectRepository(LibrarySubscription)
    private readonly librarySubscriptionRepository: Repository<LibrarySubscription>,
    @InjectRepository(LibraryUpdateHistory)
    private readonly libraryUpdateHistoryRepository: Repository<LibraryUpdateHistory>,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => LibraryTagService))
    private readonly libraryTagService: LibraryTagService,
    private readonly notificationService: NotificationService,
  ) {}

  // 서재 생성
  async create(
    userId: number,
    createLibraryDto: CreateLibraryDto,
  ): Promise<LibraryResponseDto> {
    const user = await this.userService.findOne(userId);

    const library = this.libraryRepository.create({
      ...createLibraryDto,
      owner: user,
      ownerId: userId,
    });

    const savedLibrary = await this.libraryRepository.save(library);

    // 서재 생성 이력 추가
    await this.addUpdateHistory(
      savedLibrary.id,
      'LIBRARY_CREATE',
      LibraryActivityType.LIBRARY_CREATE,
      userId,
      null,
      null,
      null,
    );

    // 태그 처리 - 제공된 태그 ID 배열이 있는 경우
    if (createLibraryDto.tagIds && createLibraryDto.tagIds.length > 0) {
      this.logger.log(
        `서재 생성 시 태그 추가: ${createLibraryDto.tagIds.join(', ')}`,
      );

      for (const tagId of createLibraryDto.tagIds) {
        try {
          // 태그 ID로 태그 조회
          const tag = await this.libraryTagService.findOne(tagId);

          // 라이브러리-태그 매핑 생성
          const libraryTagMapping = this.libraryTagMappingRepository.create({
            library: savedLibrary,
            libraryId: savedLibrary.id,
            libraryTag: tag,
            libraryTagId: tag.id,
          });

          await this.libraryTagMappingRepository.save(libraryTagMapping);

          // 태그 사용 횟수 증가
          await this.libraryTagService.incrementUsage(tag.id);

          // 태그 추가 이력
          await this.addUpdateHistory(
            savedLibrary.id,
            'TAG_ADD',
            LibraryActivityType.TAG_ADD,
            userId,
            null,
            tag.id,
            null,
          );
        } catch (error) {
          this.logger.error(`태그 추가 중 오류 발생: ${error.message}`);
        }
      }
    }

    return this.mapToLibraryResponseDto(savedLibrary);
  }

  // 홈화면용 인기 서재 목록 조회
  async findPopularLibrariesForHome(limit: number = 3): Promise<any> {
    // 구독자 수가 많은 순으로 공개 서재 조회
    const popularLibraries = await this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
      .leftJoinAndSelect('libraryBooks.book', 'book')
      .where('library.isPublic = :isPublic', { isPublic: true })
      .orderBy('library.subscriberCount', 'DESC')
      .take(limit)
      .getMany();

    // 홈화면에 표시할 형태로 데이터 가공
    const result = popularLibraries.map((library) => {
      // 미리보기용 책 - 최근 추가된 3권으로 제한
      const previewBooks = library.libraryBooks
        ? library.libraryBooks
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 3)
            .map((libraryBook) => ({
              id: libraryBook.book.id,
              title: libraryBook.book.title,
              author: libraryBook.book.author,
              coverImage: libraryBook.book.coverImage,
            }))
        : [];

      return {
        id: library.id,
        name: library.name,
        ownerName: library.owner.username,
        subscriberCount: library.subscriberCount,
        bookCount: library.libraryBooks.length,
        previewBooks,
      };
    });

    return result;
  }

  // 모든 서재 목록 조회 (공개된 서재만)
  async findAll(
    userId?: number,
    sortOption?: LibrarySortOption,
    page: number = 1,
    limit: number = 10,
    query?: string,
    tagId?: number,
  ): Promise<PaginatedLibraryResponse> {
    const skip = (page - 1) * limit;

    this.logger.log(
      `서재 목록 조회 시작: userId=${userId}, sort=${sortOption}, page=${page}, limit=${limit}, query=${query}, tagId=${tagId}`,
    );

    try {
      // 공개 서재만 가져오거나, 사용자 ID가 제공된 경우 해당 사용자의 서재까지 가져옴
      let qb = this.libraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.owner', 'owner')
        .leftJoinAndSelect('library.libraryTagMappings', 'tagMappings')
        .leftJoinAndSelect('tagMappings.libraryTag', 'tag')
        .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
        .leftJoinAndSelect('libraryBooks.book', 'book');

      this.logger.debug('기본 쿼리 생성됨');

      // 기본 조건: 공개 서재만 보이거나, 자신의 서재도 보이게 함
      if (userId) {
        qb = qb.where(
          '(library.isPublic = :isPublic OR library.ownerId = :ownerId)',
          {
            isPublic: true,
            ownerId: userId,
          },
        );
      } else {
        qb = qb.where('library.isPublic = :isPublic', { isPublic: true });
      }

      // 태그 ID가 제공된 경우 해당 태그를 가진 서재만 필터링
      if (tagId) {
        this.logger.debug(`태그 ID ${tagId} 필터 적용 시도`);
        try {
          qb = qb.andWhere('tag.id = :tagId', { tagId });
        } catch (error) {
          this.logger.error(`태그 필터링 중 오류 발생: ${error.message}`);
        }
      }

      // 검색어가 제공된 경우 서재 이름, 설명, 태그 이름으로 검색
      if (query && query.trim() !== '') {
        const searchTerm = `%${query.trim()}%`;
        qb = qb.andWhere(
          new Brackets((qb) => {
            qb.where('library.name LIKE :searchTerm', { searchTerm })
              .orWhere('library.description LIKE :searchTerm', { searchTerm })
              .orWhere('tag.name LIKE :searchTerm', { searchTerm });
          }),
        );
      }

      // 전체 개수 계산을 위한 카운트 쿼리
      const totalCount = await qb.getCount();

      // 로그 추가 - 쿼리 확인용
      const rawQuery = qb.getQueryAndParameters();
      this.logger.debug(`실행되는 쿼리: ${rawQuery[0]}`);
      this.logger.debug(`파라미터: ${JSON.stringify(rawQuery[1])}`);

      // 정렬 옵션 적용
      switch (sortOption) {
        case LibrarySortOption.SUBSCRIBERS:
          qb = qb.orderBy('library.subscriberCount', 'DESC');
          break;
        case LibrarySortOption.BOOKS:
          // 책 수로 정렬하는 것은 아래에서 처리 (일단 생성일 순으로 정렬)
          qb = qb.orderBy('library.createdAt', 'DESC');
          break;
        case LibrarySortOption.RECENT:
          qb = qb.orderBy('library.createdAt', 'DESC');
          break;
        default:
          // 기본은 최신순
          qb = qb.orderBy('library.createdAt', 'DESC');
          break;
      }

      // 페이지네이션 적용
      qb = qb.skip(skip).take(limit);

      const libraries = await qb.getMany();

      let librariesWithDetails = await Promise.all(
        libraries.map(async (library) => {
          const isSubscribed = userId
            ? await this.isUserSubscribed(userId, library.id)
            : false;

          // 미리보기용 책 - 최근 추가된 3권으로 제한
          const previewBooks = library.libraryBooks
            ? library.libraryBooks
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 3)
                .map((libraryBook) => ({
                  id: libraryBook.book.id,
                  title: libraryBook.book.title,
                  author: libraryBook.book.author,
                  coverImage: libraryBook.book.coverImage,
                  isbn: libraryBook.book.isbn,
                  publisher: libraryBook.book.publisher,
                }))
            : [];

          // 태그 정보를 매핑에서 추출
          const tags = library.libraryTagMappings
            ? library.libraryTagMappings.map((mapping) => ({
                id: mapping.id,
                tagId: mapping.libraryTag.id,
                tagName: mapping.libraryTag.name,
                usageCount: mapping.libraryTag.usageCount,
                libraryId: mapping.libraryId,
                note: mapping.note,
                createdAt: mapping.createdAt,
                updatedAt: mapping.updatedAt,
              }))
            : [];

          return {
            id: library.id,
            name: library.name,
            description: library.description,
            isPublic: library.isPublic,
            subscriberCount: library.subscriberCount,
            owner: {
              id: library.owner.id,
              username: library.owner.username,
              email: library.owner.email,
            },
            tags,
            bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
            previewBooks,
            isSubscribed,
            createdAt: library.createdAt,
            updatedAt: library.updatedAt,
          };
        }),
      );

      // 책 개수로 정렬해야 하는 경우 메모리에서 정렬
      if (sortOption === LibrarySortOption.BOOKS) {
        librariesWithDetails = librariesWithDetails.sort(
          (a, b) => b.bookCount - a.bookCount,
        );
      }

      // 태그 정보 추가
      let tagName = '';
      if (tagId) {
        try {
          const tag = await this.libraryTagService.findOne(tagId);
          tagName = tag.name;
        } catch (error) {
          this.logger.warn(
            `태그 ID ${tagId}의 정보를 가져오는 데 실패했습니다: ${error.message}`,
          );
        }
      }

      return {
        data: librariesWithDetails,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          sort: sortOption,
          query: query || undefined,
          tagId: tagId || undefined,
          tagName: tagName || undefined,
        },
      };
    } catch (error) {
      this.logger.error(`서재 목록 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 특정 사용자의 서재 목록 조회
  async findAllByUser(
    userId: number,
    requestingUserId?: number,
    sortOption?: LibrarySortOption,
  ): Promise<LibraryListResponseDto[]> {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException(`사용자 ID ${userId}를 찾을 수 없습니다.`);
    }

    // 해당 사용자의 공개 서재 + (본인 요청시 비공개 서재도)
    let qb = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.libraryTagMappings', 'tagMappings')
      .leftJoinAndSelect('tagMappings.libraryTag', 'tag')
      .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
      .leftJoinAndSelect('libraryBooks.book', 'book')
      .where('library.ownerId = :ownerId', { ownerId: userId });

    // 본인이 아닌 경우 공개 서재만 보여줌
    if (requestingUserId !== userId) {
      qb = qb.andWhere('library.isPublic = :isPublic', { isPublic: true });
    }

    // 정렬 옵션 적용
    switch (sortOption) {
      case LibrarySortOption.SUBSCRIBERS:
        qb = qb.orderBy('library.subscriberCount', 'DESC');
        break;
      case LibrarySortOption.BOOKS:
        // 책 수로 정렬하려면 추가 작업 필요
        // 쿼리 결과를 가져온 후 JS에서 정렬
        break;
      case LibrarySortOption.RECENT:
        qb = qb.orderBy('library.createdAt', 'DESC');
        break;
      default:
        // 기본은 최신순
        qb = qb.orderBy('library.createdAt', 'DESC');
        break;
    }

    const libraries = await qb.getMany();

    let result = await Promise.all(
      libraries.map(async (library) => {
        const isSubscribed = requestingUserId
          ? await this.isUserSubscribed(requestingUserId, library.id)
          : false;

        // 미리보기용 책 - 최근 추가된 3권으로 제한
        const previewBooks = library.libraryBooks
          ? library.libraryBooks
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 3)
              .map((libraryBook) => ({
                id: libraryBook.book.id,
                title: libraryBook.book.title,
                author: libraryBook.book.author,
                coverImage: libraryBook.book.coverImage,
                isbn: libraryBook.book.isbn,
                publisher: libraryBook.book.publisher,
              }))
          : [];

        // 태그 정보를 매핑에서 추출
        const tags = library.libraryTagMappings
          ? library.libraryTagMappings.map((mapping) => ({
              id: mapping.id,
              tagId: mapping.libraryTag.id,
              tagName: mapping.libraryTag.name,
              usageCount: mapping.libraryTag.usageCount,
              libraryId: mapping.libraryId,
              note: mapping.note,
              createdAt: mapping.createdAt,
              updatedAt: mapping.updatedAt,
            }))
          : [];

        return {
          id: library.id,
          name: library.name,
          description: library.description,
          isPublic: library.isPublic,
          subscriberCount: library.subscriberCount,
          owner: {
            id: library.owner.id,
            username: library.owner.username,
            email: library.owner.email,
          },
          tags,
          bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
          previewBooks,
          isSubscribed,
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );

    // 책 개수로 정렬해야 하는 경우 메모리에서 정렬
    if (sortOption === LibrarySortOption.BOOKS) {
      result = result.sort((a, b) => b.bookCount - a.bookCount);
    }

    return result;
  }

  // 구독중인 서재 목록 조회
  async findSubscribedLibraries(
    userId: number,
    sortOption?: LibrarySortOption,
  ): Promise<LibraryListResponseDto[]> {
    const subscriptions = await this.librarySubscriptionRepository.find({
      where: { subscriberId: userId },
      relations: ['library'],
    });

    if (subscriptions.length === 0) {
      return [];
    }

    const libraryIds = subscriptions.map(
      (subscription) => subscription.libraryId,
    );

    let qb = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.libraryTagMappings', 'tagMappings')
      .leftJoinAndSelect('tagMappings.libraryTag', 'tag')
      .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
      .leftJoinAndSelect('libraryBooks.book', 'book')
      .where('library.id IN (:...ids)', { ids: libraryIds });

    // 정렬 옵션 적용
    switch (sortOption) {
      case LibrarySortOption.SUBSCRIBERS:
        qb = qb.orderBy('library.subscriberCount', 'DESC');
        break;
      case LibrarySortOption.BOOKS:
        // 책 수로 정렬하려면 추가 작업 필요
        // 쿼리 결과를 가져온 후 JS에서 정렬
        break;
      case LibrarySortOption.RECENT:
        qb = qb.orderBy('library.createdAt', 'DESC');
        break;
      default:
        // 기본은 최신순
        qb = qb.orderBy('library.createdAt', 'DESC');
        break;
    }

    const libraries = await qb.getMany();

    let result = await Promise.all(
      libraries.map(async (library) => {
        const isSubscribed = true; // 당연히 모두 구독 중인 서재들

        // 미리보기용 책 - 최근 추가된 3권으로 제한
        const previewBooks = library.libraryBooks
          ? library.libraryBooks
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 3)
              .map((libraryBook) => ({
                id: libraryBook.book.id,
                title: libraryBook.book.title,
                author: libraryBook.book.author,
                coverImage: libraryBook.book.coverImage,
                isbn: libraryBook.book.isbn,
                publisher: libraryBook.book.publisher,
              }))
          : [];

        // 태그 정보를 매핑에서 추출
        const tags = library.libraryTagMappings
          ? library.libraryTagMappings.map((mapping) => ({
              id: mapping.id,
              tagId: mapping.libraryTag.id,
              tagName: mapping.libraryTag.name,
              usageCount: mapping.libraryTag.usageCount,
              libraryId: mapping.libraryId,
              note: mapping.note,
              createdAt: mapping.createdAt,
              updatedAt: mapping.updatedAt,
            }))
          : [];

        return {
          id: library.id,
          name: library.name,
          description: library.description,
          isPublic: library.isPublic,
          subscriberCount: library.subscriberCount,
          owner: {
            id: library.owner.id,
            username: library.owner.username,
            email: library.owner.email,
          },
          tags,
          bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
          previewBooks,
          isSubscribed,
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );

    // 책 개수로 정렬해야 하는 경우 메모리에서 정렬
    if (sortOption === LibrarySortOption.BOOKS) {
      result = result.sort((a, b) => b.bookCount - a.bookCount);
    }

    return result;
  }

  // 특정 서재 상세 조회
  async findOne(
    id: number,
    userId?: number,
  ): Promise<LibraryDetailResponseDto> {
    this.logger.log(`서재 상세 조회: libraryId=${id}, userId=${userId}`);

    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: [
        'owner',
        'libraryBooks',
        'libraryBooks.book',
        'libraryTagMappings',
        'libraryTagMappings.libraryTag',
        'subscriptions',
        'subscriptions.subscriber',
        'updateHistory',
      ],
    });

    if (!library) {
      throw new NotFoundException(`Library with ID ${id} not found`);
    }

    // Check if the user is subscribed to this library
    let isSubscribed = false;

    if (userId) {
      this.logger.debug(`사용자(${userId})의 서재(${id}) 구독 여부 확인`);

      // 1. 직접 subscriptions 배열에서 확인
      if (library.subscriptions && library.subscriptions.length > 0) {
        isSubscribed = library.subscriptions.some(
          (sub) => sub.subscriberId === userId,
        );
        this.logger.debug(
          `구독 관계에서 직접 확인: ${isSubscribed ? '구독 중' : '미구독'}`,
        );
      }

      // 2. 관계에서 찾지 못한 경우 레포지토리를 통해 다시 확인
      if (!isSubscribed) {
        isSubscribed = await this.isUserSubscribed(userId, id);
        this.logger.debug(
          `isUserSubscribed 메서드 호출 결과: ${isSubscribed ? '구독 중' : '미구독'}`,
        );
      }
    }

    const libraryBooks = library.libraryBooks.map((libraryBook) => {
      return {
        id: libraryBook.id,
        bookId: libraryBook.bookId,
        libraryId: libraryBook.libraryId,
        note: libraryBook.note,
        book: {
          id: libraryBook.book.id,
          title: libraryBook.book.title,
          author: libraryBook.book.author,
          isbn: libraryBook.book.isbn,
          coverImage: libraryBook.book.coverImage,
          publisher: libraryBook.book.publisher,
        },
        createdAt: libraryBook.createdAt,
      };
    });

    // 태그 정보를 매핑에서 추출
    const tags = library.libraryTagMappings
      ? library.libraryTagMappings.map((mapping) => ({
          id: mapping.id,
          tagId: mapping.libraryTag.id,
          tagName: mapping.libraryTag.name,
          usageCount: mapping.libraryTag.usageCount,
          libraryId: mapping.libraryId,
          note: mapping.note,
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt,
        }))
      : [];

    // 최근 업데이트 이력
    const recentUpdates = library.updateHistory
      ? library.updateHistory
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5) // 최근 5개만 가져오기
          .map((update) => ({
            id: update.id,
            date: update.createdAt,
            message: update.message,
            activityType: update.activityType,
            userId: update.userId,
            bookId: update.bookId,
            tagId: update.tagId,
            bookTitle: update.bookTitle,
          }))
      : [];

    return {
      id: library.id,
      name: library.name,
      description: library.description,
      isPublic: library.isPublic,
      owner: {
        id: library.owner.id,
        username: library.owner.username,
        email: library.owner.email,
      },
      books: libraryBooks,
      tags,
      isSubscribed,
      subscriberCount: library.subscriptions?.length || 0,
      subscribers:
        library.subscriptions?.map((subscription) => ({
          id: subscription.subscriber.id,
          username: subscription.subscriber.username,
          email: subscription.subscriber.email,
          profileImage: null, // 프로필 이미지가 있다면 추가
        })) || [],
      recentUpdates,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
    };
  }

  // 서재 업데이트
  async update(
    id: number,
    userId: number,
    updateLibraryDto: UpdateLibraryDto,
  ): Promise<LibraryResponseDto> {
    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${id}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException('이 서재를 수정할 권한이 없습니다.');
    }

    const oldName = library.name;

    // 태그를 제외한 다른 필드 업데이트
    const { tagIds, ...libraryDataToUpdate } = updateLibraryDto;
    Object.assign(library, libraryDataToUpdate);

    const updatedLibrary = await this.libraryRepository.save(library);

    // 서재 정보 업데이트 이력 추가
    if (oldName !== updatedLibrary.name) {
      // 서재 제목이 변경된 경우 LIBRARY_TITLE_UPDATE 타입으로 히스토리 추가
      await this.addUpdateHistory(
        id,
        'LIBRARY_TITLE_UPDATE',
        LibraryActivityType.LIBRARY_TITLE_UPDATE,
        userId,
        null,
        null,
        null,
      );
    } else {
      // 그 외 변경사항에 대해서 일반 업데이트 히스토리 추가
      await this.addUpdateHistory(
        id,
        'LIBRARY_UPDATE',
        LibraryActivityType.LIBRARY_UPDATE,
        userId,
        null,
        null,
        null,
      );
    }

    // 태그 업데이트 처리
    if (tagIds && Array.isArray(tagIds)) {
      // 기존 태그 목록 가져오기
      const existingMappings = await this.libraryTagMappingRepository.find({
        where: { libraryId: id },
        relations: ['libraryTag'],
      });

      const existingTagIds = existingMappings.map(
        (mapping) => mapping.libraryTagId,
      );
      const newTagIds = tagIds.filter((tagId) => tagId > 0); // 유효한 ID만 필터링

      // 제거할 태그 (기존에 있으나 새 목록에 없는 태그)
      const tagsToRemove = existingMappings.filter(
        (mapping) => !newTagIds.includes(mapping.libraryTagId),
      );

      // 추가할 태그 (새 목록에 있으나 기존에 없는 태그)
      const tagsToAdd = newTagIds.filter(
        (tagId) => !existingTagIds.includes(tagId),
      );

      // 태그 제거
      for (const mapping of tagsToRemove) {
        try {
          // 태그 사용 횟수 감소
          await this.libraryTagService.decrementUsage(mapping.libraryTagId);

          // 매핑 삭제
          await this.libraryTagMappingRepository.remove(mapping);

          // 태그 제거 이력
          await this.addUpdateHistory(
            id,
            'TAG_REMOVE',
            LibraryActivityType.TAG_REMOVE,
            userId,
            null,
            mapping.libraryTagId,
            null,
          );
        } catch (error) {
          this.logger.error(`태그 제거 중 오류 발생: ${error.message}`);
        }
      }

      // 태그 추가
      for (const tagId of tagsToAdd) {
        try {
          // ID로 태그 찾기
          const tag = await this.libraryTagService.findOne(tagId);

          // 이미 매핑이 있는지 확인
          const existingMapping =
            await this.libraryTagMappingRepository.findOne({
              where: {
                libraryId: id,
                libraryTagId: tagId,
              },
            });

          if (!existingMapping) {
            // 라이브러리-태그 매핑 생성
            const libraryTagMapping = this.libraryTagMappingRepository.create({
              library,
              libraryId: id,
              libraryTag: tag,
              libraryTagId: tag.id,
            });

            await this.libraryTagMappingRepository.save(libraryTagMapping);

            // 태그 사용 횟수 증가
            await this.libraryTagService.incrementUsage(tag.id);

            // 태그 추가 이력
            await this.addUpdateHistory(
              id,
              'TAG_ADD',
              LibraryActivityType.TAG_ADD,
              userId,
              null,
              tag.id,
              null,
            );
          }
        } catch (error) {
          this.logger.error(`태그 추가 중 오류 발생: ${error.message}`);
        }
      }
    }

    return this.mapToLibraryResponseDto(updatedLibrary);
  }

  // 서재 삭제
  async remove(id: number, userId: number): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${id}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException('이 서재를 삭제할 권한이 없습니다.');
    }

    // 관련된 libraryBooks, libraryTagMappings, subscriptions, updateHistory 먼저 삭제
    await this.libraryBookRepository.delete({ libraryId: id });
    await this.libraryTagMappingRepository.delete({ libraryId: id });
    await this.librarySubscriptionRepository.delete({ libraryId: id });
    await this.libraryUpdateHistoryRepository.delete({ libraryId: id });

    await this.libraryRepository.remove(library);
  }

  // 서재에 책 추가
  async addBookToLibrary(
    libraryId: number,
    userId: number,
    addBookToLibraryDto: AddBookToLibraryDto,
  ): Promise<LibraryBookResponseDto> {
    try {
      // 라이브러리 존재 및 사용자 권한 확인
      const library = await this.findOne(libraryId);
      if (library.owner.id !== userId) {
        throw new ForbiddenException(
          '이 라이브러리에 책을 추가할 권한이 없습니다.',
        );
      }

      // 책 처리
      let book: any;

      // bookId가 -1이고 ISBN이 제공된 경우: ISBN으로 책을 검색하거나 새로 등록
      if (addBookToLibraryDto.bookId === -1 && addBookToLibraryDto.isbn) {
        this.logger.log(
          `bookId가 -1이고 ISBN ${addBookToLibraryDto.isbn}이 제공되어 책을 조회합니다.`,
        );

        try {
          // ISBN으로 책 조회 또는 생성 (saveToDb=true로 설정하여 DB에 저장)
          book = await this.bookService.getBookDetailByIsbn(
            addBookToLibraryDto.isbn,
            true,
          );
          this.logger.log(
            `ISBN ${addBookToLibraryDto.isbn}로 책을 찾았거나 생성했습니다. ID: ${book.id}`,
          );
        } catch (error) {
          this.logger.error(
            `ISBN ${addBookToLibraryDto.isbn}로 책을 찾을 수 없습니다: ${error.message}`,
          );
          throw new NotFoundException(
            `ISBN ${addBookToLibraryDto.isbn}로 책을 찾을 수 없습니다.`,
          );
        }
      }
      // 일반적인 경우: 기존 DB에서 책 ID로 검색
      else {
        try {
          book = await this.bookService.findById(addBookToLibraryDto.bookId);
        } catch (error) {
          if (error instanceof NotFoundException) {
            // ID로 책을 찾을 수 없는 경우, ISBN이 제공되었다면 ISBN으로 검색
            if (addBookToLibraryDto.isbn) {
              this.logger.log(
                `책 ID ${addBookToLibraryDto.bookId}를 찾을 수 없어 ISBN ${addBookToLibraryDto.isbn}으로 검색합니다.`,
              );

              // ISBN으로 책을 가져와 저장
              book = await this.bookService.getBookDetailByIsbn(
                addBookToLibraryDto.isbn,
                true,
              );
            } else {
              throw new NotFoundException('책을 찾을 수 없습니다.');
            }
          } else {
            throw error; // 다른 에러는 그대로 전파
          }
        }
      }

      if (!book) {
        throw new NotFoundException('책을 찾을 수 없습니다.');
      }

      // 이미 라이브러리에 책이 있는지 확인
      const existingBook = await this.libraryBookRepository.findOne({
        where: {
          libraryId,
          bookId: book.id,
        },
      });

      if (existingBook) {
        throw new ConflictException('이미 라이브러리에 추가된 책입니다.');
      }

      // 책 추가
      const libraryBook = this.libraryBookRepository.create({
        libraryId,
        bookId: book.id,
        note: addBookToLibraryDto.note,
      });

      const savedLibraryBook =
        await this.libraryBookRepository.save(libraryBook);

      // 라이브러리 업데이트 이력 저장
      await this.addUpdateHistory(
        libraryId,
        'BOOK_ADD',
        LibraryActivityType.BOOK_ADD,
        userId,
        book.id,
        null,
        book.title,
      );

      // 구독자들에게 알림 발송
      const subscribers = await this.getLibrarySubscribers(libraryId);
      if (subscribers.length > 0) {
        const subscriberIds = subscribers.map((subscriber) => subscriber.id);
        await this.notificationService.createLibraryUpdateNotification(
          libraryId,
          library.name,
          book.id,
          book.title,
          subscriberIds,
        );
      }

      return {
        id: savedLibraryBook.id,
        bookId: savedLibraryBook.bookId,
        libraryId: savedLibraryBook.libraryId,
        note: savedLibraryBook.note,
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          publisher: book.publisher,
          isbn: book.isbn,
        },
        createdAt: savedLibraryBook.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `라이브러리(${libraryId})에 책 추가 실패: ${error.message}`,
      );
      throw error;
    }
  }

  // 서재에서 책 제거
  async removeBookFromLibrary(
    libraryId: number,
    bookId: number,
    userId: number,
  ): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException('이 서재에서 책을 제거할 권한이 없습니다.');
    }

    const libraryBook = await this.libraryBookRepository.findOne({
      where: {
        libraryId,
        bookId,
      },
      relations: ['book'],
    });

    if (!libraryBook) {
      throw new NotFoundException(`해당 책을 서재에서 찾을 수 없습니다.`);
    }

    const bookTitle = libraryBook.book.title;
    await this.libraryBookRepository.remove(libraryBook);

    // 책 제거 이력
    await this.addUpdateHistory(
      libraryId,
      'BOOK_REMOVE',
      LibraryActivityType.BOOK_REMOVE,
      userId,
      bookId,
      null,
      bookTitle,
    );
  }

  // 서재에 태그 추가
  async addTagToLibrary(
    libraryId: number,
    userId: number,
    addTagToLibraryDto: AddTagToLibraryDto,
  ): Promise<LibraryTagResponseDto> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException('이 서재에 태그를 추가할 권한이 없습니다.');
    }

    // 태그를 찾거나 새로 생성
    let tagName = addTagToLibraryDto.name;
    let tag;

    if (!tagName) {
      throw new BadRequestException('태그 이름이 필요합니다.');
    }

    // 이름으로 태그 찾기 또는 생성
    tag = await this.libraryTagService.findOrCreateTag(tagName);

    // 이미 서재에 해당 태그가 있는지 확인
    const existingMapping = await this.libraryTagMappingRepository.findOne({
      where: {
        libraryId,
        libraryTagId: tag.id,
      },
    });

    if (existingMapping) {
      throw new BadRequestException('이미 서재에 추가된 태그입니다.');
    }

    // 라이브러리-태그 매핑 생성
    const libraryTagMapping = this.libraryTagMappingRepository.create({
      library,
      libraryId,
      libraryTag: tag,
      libraryTagId: tag.id,
      note: addTagToLibraryDto.note,
    });

    const savedMapping =
      await this.libraryTagMappingRepository.save(libraryTagMapping);

    // 태그 사용 횟수 증가
    await this.libraryTagService.incrementUsage(tag.id);

    // 태그 추가 이력
    await this.addUpdateHistory(
      libraryId,
      'TAG_ADD',
      LibraryActivityType.TAG_ADD,
      userId,
      null,
      tag.id,
      null,
    );

    return {
      id: savedMapping.id,
      tagId: tag.id,
      tagName: tag.name,
      usageCount: tag.usageCount,
      libraryId: savedMapping.libraryId,
      note: savedMapping.note,
      createdAt: savedMapping.createdAt,
    };
  }

  // 서재에서 태그 제거
  async removeTagFromLibrary(
    libraryId: number,
    tagId: number,
    userId: number,
  ): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException(
        '이 서재에서 태그를 제거할 권한이 없습니다.',
      );
    }

    const mapping = await this.libraryTagMappingRepository.findOne({
      where: {
        libraryId,
        libraryTagId: tagId,
      },
      relations: ['libraryTag'],
    });

    if (!mapping) {
      throw new NotFoundException(
        `태그 ID ${tagId}를 서재에서 찾을 수 없습니다.`,
      );
    }

    const tagName = mapping.libraryTag.name;

    // 태그 사용 횟수 감소
    await this.libraryTagService.decrementUsage(tagId);

    // 라이브러리 태그 매핑 삭제
    await this.libraryTagMappingRepository.remove(mapping);

    // 태그 제거 이력
    await this.addUpdateHistory(
      libraryId,
      'TAG_REMOVE',
      LibraryActivityType.TAG_REMOVE,
      userId,
      null,
      tagId,
      null,
    );
  }

  // 서재 구독하기
  async subscribeToLibrary(libraryId: number, userId: number): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    if (!library.isPublic) {
      throw new ForbiddenException('비공개 서재는 구독할 수 없습니다.');
    }

    // 자신의 서재는 구독할 수 없음
    if (library.ownerId === userId) {
      throw new BadRequestException('자신의 서재는 구독할 수 없습니다.');
    }

    // 이미 구독 중인지 확인
    const existingSubscription =
      await this.librarySubscriptionRepository.findOne({
        where: {
          libraryId,
          subscriberId: userId,
        },
      });

    if (existingSubscription) {
      throw new BadRequestException('이미 구독 중인 서재입니다.');
    }

    const user = await this.userService.findOne(userId);

    const subscription = this.librarySubscriptionRepository.create({
      library,
      libraryId,
      subscriber: user,
      subscriberId: userId,
    });

    await this.librarySubscriptionRepository.save(subscription);

    // 구독자 수 증가
    library.subscriberCount += 1;
    await this.libraryRepository.save(library);

    // 구독 이력
    await this.addUpdateHistory(
      libraryId,
      'SUBSCRIPTION_ADD',
      LibraryActivityType.SUBSCRIPTION_ADD,
      userId,
      null,
      null,
      null,
    );
  }

  // 서재 구독 취소하기
  async unsubscribeFromLibrary(
    libraryId: number,
    userId: number,
  ): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    const subscription = await this.librarySubscriptionRepository.findOne({
      where: {
        libraryId,
        subscriberId: userId,
      },
      relations: ['subscriber'],
    });

    if (!subscription) {
      throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
    }

    const userName = subscription.subscriber.username;
    await this.librarySubscriptionRepository.remove(subscription);

    // 구독자 수 감소
    if (library.subscriberCount > 0) {
      library.subscriberCount -= 1;
      await this.libraryRepository.save(library);
    }

    // 구독 취소 이력
    await this.addUpdateHistory(
      libraryId,
      'SUBSCRIPTION_REMOVE',
      LibraryActivityType.SUBSCRIPTION_REMOVE,
      userId,
      null,
      null,
      null,
    );
  }

  // 서재의 구독자 목록 조회
  async getLibrarySubscribers(id: number): Promise<SubscriberResponseDto[]> {
    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: ['subscriptions', 'subscriptions.subscriber'],
    });

    if (!library) {
      throw new NotFoundException(`Library with ID ${id} not found`);
    }

    return library.subscriptions.map((subscription) => ({
      id: subscription.subscriber.id,
      username: subscription.subscriber.username,
      email: subscription.subscriber.email,
      profileImage: null, // 프로필 이미지가 있다면 추가
    }));
  }

  // 최근 업데이트 이력 조회
  async getRecentUpdates(
    libraryId: number,
    limit: number = 5,
  ): Promise<UpdateHistoryItem[]> {
    const updates = await this.libraryUpdateHistoryRepository.find({
      where: { libraryId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return updates.map((update) => ({
      id: update.id,
      date: update.createdAt,
      message: update.message,
      activityType: update.activityType,
      userId: update.userId,
      bookId: update.bookId,
      tagId: update.tagId,
      bookTitle: update.bookTitle,
    }));
  }

  // 업데이트 이력 추가
  async addUpdateHistory(
    libraryId: number,
    message: string,
    activityType: LibraryActivityType = LibraryActivityType.OTHER,
    userId?: number,
    bookId?: number,
    tagId?: number,
    bookTitle?: string,
  ): Promise<void> {
    const updateHistory = this.libraryUpdateHistoryRepository.create({
      libraryId,
      message,
      activityType,
      userId,
      bookId,
      tagId,
      bookTitle,
    });

    await this.libraryUpdateHistoryRepository.save(updateHistory);
  }

  // 사용자가 서재를 구독 중인지 확인
  private async isUserSubscribed(
    userId: number,
    libraryId: number,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `isUserSubscribed 호출: userId=${userId}, libraryId=${libraryId}`,
      );

      // 구독 정보 확인 - 구독 테이블에서 직접 조회
      const subscription = await this.librarySubscriptionRepository.findOne({
        where: {
          libraryId,
          subscriberId: userId,
        },
      });

      if (subscription) {
        this.logger.debug(
          `구독 정보 찾음: userId=${userId}, libraryId=${libraryId}`,
        );
        return true;
      }

      // 구독 정보가 없다면 서재의 subscriptions 관계를 통해 다시 확인
      const library = await this.libraryRepository.findOne({
        where: { id: libraryId },
        relations: ['subscriptions'],
      });

      if (library && library.subscriptions) {
        const subscribed = library.subscriptions.some(
          (sub) => sub.subscriberId === userId,
        );
        this.logger.debug(
          `관계를 통한 구독 확인: ${subscribed ? '구독 중' : '미구독'}`,
        );
        return subscribed;
      }

      return false;
    } catch (error) {
      this.logger.error(`구독 확인 중 오류 발생: ${error.message}`);
      return false;
    }
  }

  // 서재 엔티티를 응답 DTO로 변환
  private async mapToLibraryResponseDto(
    library: Library,
  ): Promise<LibraryResponseDto> {
    return {
      id: library.id,
      name: library.name,
      description: library.description,
      isPublic: library.isPublic,
      subscriberCount: library.subscriberCount,
      owner: {
        id: library.owner.id,
        username: library.owner.username,
        email: library.owner.email,
      },
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
    };
  }

  // 라이브러리 태그 매핑 메소드 (더 이상 사용하지 않음)
  private mapLibraryTagToDto(libraryTag: LibraryTag): LibraryTagResponseDto {
    return {
      id: libraryTag.id,
      tagId: libraryTag.id,
      tagName: libraryTag.name,
      usageCount: libraryTag.usageCount,
      libraryId: 0, // 이제 LibraryTag에 libraryId가 없으므로 기본값 설정
      note: libraryTag.note,
      createdAt: libraryTag.createdAt,
      updatedAt: libraryTag.updatedAt,
    };
  }

  /**
   * 특정 책이 등록된 서재 목록 조회
   */
  async findLibrariesByBookId(
    bookId: number,
    page: number = 1,
    limit: number = 10,
    userId?: number,
    isbn?: string,
    sortOption?: LibrarySortOption,
  ): Promise<PaginatedLibraryResponse> {
    const skip = (page - 1) * limit;

    try {
      // bookId가 -1이고 ISBN이 제공된 경우, ISBN으로 책을 찾음
      if (bookId === -1 && isbn) {
        this.logger.log(
          `bookId가 -1이고 ISBN ${isbn}이 제공되어 책을 조회합니다.`,
        );

        try {
          // ISBN으로 책 조회 (saveToDb=false로 설정하여 DB에 저장하지 않음)
          const book = await this.bookService.getBookDetailByIsbn(isbn, false);
          this.logger.log(`ISBN ${isbn}로 책을 찾았습니다. ID: ${book.id}`);

          // DB에 이미 존재하는 책인 경우에만 실제 bookId로 검색 진행
          if (book.id > 0) {
            bookId = book.id;
          } else {
            // 책이 DB에 없는 경우 빈 결과 반환
            return {
              data: [],
              meta: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                sort: sortOption,
              },
            };
          }
        } catch (error) {
          this.logger.error(
            `ISBN ${isbn}로 책을 찾을 수 없습니다: ${error.message}`,
          );
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
              sort: sortOption,
            },
          };
        }
      }

      // 서재 조인 쿼리 생성
      const queryBuilder = this.libraryRepository
        .createQueryBuilder('library')
        .innerJoin('library_book', 'lb', 'library.id = lb.library_id')
        .leftJoinAndSelect('library.owner', 'owner')
        .leftJoinAndSelect('library.libraryTagMappings', 'tagMappings')
        .leftJoinAndSelect('tagMappings.libraryTag', 'tag')
        .where('lb.book_id = :bookId', { bookId })
        .andWhere('library.is_public = :isPublic', { isPublic: true });

      // 로그인한 사용자의 비공개 서재도 포함
      if (userId) {
        queryBuilder.orWhere(
          'lb.book_id = :bookId AND library.owner_id = :ownerId',
          { bookId, ownerId: userId },
        );
      }

      // 정렬 옵션 적용
      switch (sortOption) {
        case LibrarySortOption.SUBSCRIBERS:
          queryBuilder.orderBy('library.subscriberCount', 'DESC');
          break;
        case LibrarySortOption.BOOKS:
          // 책 수로 정렬은 나중에 처리
          queryBuilder.orderBy('library.updatedAt', 'DESC');
          break;
        case LibrarySortOption.RECENT:
          queryBuilder.orderBy('library.createdAt', 'DESC');
          break;
        default:
          // 기본은 최신 업데이트순
          queryBuilder.orderBy('library.updatedAt', 'DESC');
          break;
      }

      // 페이지네이션 적용
      queryBuilder.skip(skip).take(limit);

      // 서재 목록 조회
      const [libraries, total] = await queryBuilder.getManyAndCount();

      // 서재별 상세 정보 추가
      const librariesWithDetails = await Promise.all(
        libraries.map(async (library) => {
          // 책 미리보기 목록 조회
          const previewBooks = await this.libraryBookRepository.find({
            where: { libraryId: library.id },
            relations: ['book'],
            order: { createdAt: 'DESC' },
            take: 3,
          });

          // 책 수 조회
          const bookCount = await this.libraryBookRepository.count({
            where: { libraryId: library.id },
          });

          // 구독 여부 확인
          const isSubscribed = userId
            ? await this.isUserSubscribed(userId, library.id)
            : false;

          // 태그 정보 형식 통일
          const tags = library.libraryTagMappings
            ? library.libraryTagMappings.map((mapping) => ({
                id: mapping.id,
                tagId: mapping.libraryTag.id,
                tagName: mapping.libraryTag.name,
                usageCount: mapping.libraryTag.usageCount || 0,
                libraryId: mapping.libraryId,
                note: mapping.note,
                createdAt: mapping.createdAt,
                updatedAt: mapping.updatedAt,
              }))
            : [];

          // 미리보기용 책 정보 형식 통일
          const formattedPreviewBooks = previewBooks.map((libraryBook) => ({
            id: libraryBook.book.id,
            title: libraryBook.book.title,
            author: libraryBook.book.author,
            coverImage: libraryBook.book.coverImage,
            isbn: libraryBook.book.isbn,
            publisher: libraryBook.book.publisher,
          }));

          // LibraryListResponseDto 형식으로 통일
          return {
            id: library.id,
            name: library.name,
            description: library.description,
            isPublic: library.isPublic,
            subscriberCount: library.subscriberCount || 0,
            owner: {
              id: library.owner.id,
              username: library.owner.username,
              email: library.owner.email,
            },
            tags,
            bookCount,
            previewBooks: formattedPreviewBooks,
            isSubscribed,
            createdAt: library.createdAt,
            updatedAt: library.updatedAt,
          };
        }),
      );

      // LibrarySortOption.BOOKS인 경우 JS에서 책 수로 정렬
      if (sortOption === LibrarySortOption.BOOKS) {
        librariesWithDetails.sort((a, b) => b.bookCount - a.bookCount);
      }

      // 페이지네이션 정보와 함께 결과 반환
      return {
        data: librariesWithDetails,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          sort: sortOption,
        },
      };
    } catch (error) {
      this.logger.error(`라이브러리에서 책 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // 서재에 여러 권의 책 추가
  async addBooksToLibrary(
    libraryId: number,
    userId: number,
    addBooksToLibraryDto: AddBooksToLibraryDto,
  ): Promise<{
    success: number;
    failed: number;
    books: LibraryBookResponseDto[];
  }> {
    try {
      // 라이브러리 존재 및 사용자 권한 확인
      const library = await this.findOne(libraryId);
      if (library.owner.id !== userId) {
        throw new ForbiddenException(
          '이 라이브러리에 책을 추가할 권한이 없습니다.',
        );
      }

      const results = {
        success: 0,
        failed: 0,
        books: [] as LibraryBookResponseDto[],
      };

      // 각 책을 순차적으로 추가
      for (const bookDto of addBooksToLibraryDto.books) {
        try {
          // 기존 addBookToLibrary 로직 재사용
          const addedBook = await this.addBookToLibrary(
            libraryId,
            userId,
            bookDto,
          );

          results.success++;
          results.books.push(addedBook);
        } catch (error) {
          this.logger.error(
            `책 추가 실패 (bookId: ${bookDto.bookId}, isbn: ${bookDto.isbn}): ${error.message}`,
          );
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `라이브러리(${libraryId})에 여러 책 추가 실패: ${error.message}`,
      );
      throw error;
    }
  }
}
