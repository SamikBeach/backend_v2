import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { LibraryTag } from './entities/library-tag.entity';
import { LibrarySubscription } from './entities/library-subscription.entity';
import { LibraryUpdateHistory } from './entities/library-update-history.entity';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { AddBookToLibraryDto } from './dto/add-book-to-library.dto';
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
} from './dto/library-response.dto';
import { UserService } from '../user/user.service';
import { In } from 'typeorm';

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
    @InjectRepository(LibrarySubscription)
    private readonly librarySubscriptionRepository: Repository<LibrarySubscription>,
    @InjectRepository(LibraryUpdateHistory)
    private readonly libraryUpdateHistoryRepository: Repository<LibraryUpdateHistory>,
    private readonly bookService: BookService,
    private readonly userService: UserService,
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
      `서재 "${savedLibrary.name}"가 생성되었습니다.`,
    );

    return this.mapToLibraryResponseDto(savedLibrary);
  }

  // 모든 서재 목록 조회 (공개된 서재만)
  async findAll(userId?: number): Promise<LibraryListResponseDto[]> {
    // 공개 서재만 가져오거나, 사용자 ID가 제공된 경우 해당 사용자의 서재까지 가져옴
    let qb = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.tags', 'tags')
      .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
      .leftJoinAndSelect('libraryBooks.book', 'book')
      .where('library.isPublic = :isPublic', { isPublic: true });

    if (userId) {
      qb = qb.orWhere('library.ownerId = :ownerId', {
        ownerId: userId,
      });
    }

    const libraries = await qb.getMany();

    return Promise.all(
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
          tags: library.tags
            ? library.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                libraryId: tag.libraryId,
                createdAt: tag.createdAt,
              }))
            : [],
          bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
          previewBooks,
          isSubscribed,
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );
  }

  // 특정 사용자의 서재 목록 조회
  async findAllByUser(
    userId: number,
    requestingUserId?: number,
  ): Promise<LibraryListResponseDto[]> {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException(`사용자 ID ${userId}를 찾을 수 없습니다.`);
    }

    // 해당 사용자의 공개 서재 + (본인 요청시 비공개 서재도)
    const isOwn = requestingUserId === userId;
    const qb = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.tags', 'tags')
      .leftJoinAndSelect('library.libraryBooks', 'libraryBooks')
      .leftJoinAndSelect('libraryBooks.book', 'book')
      .where('library.ownerId = :ownerId', { ownerId: userId });

    if (!isOwn) {
      qb.andWhere('library.isPublic = :isPublic', { isPublic: true });
    }

    const libraries = await qb.getMany();

    return Promise.all(
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
          tags: library.tags
            ? library.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                libraryId: tag.libraryId,
                createdAt: tag.createdAt,
              }))
            : [],
          bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
          previewBooks,
          isSubscribed,
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );
  }

  // 사용자가 구독한 서재 목록 조회
  async findSubscribedLibraries(
    userId: number,
  ): Promise<LibraryListResponseDto[]> {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException(`사용자 ID ${userId}를 찾을 수 없습니다.`);
    }

    // 구독 중인 라이브러리 ID 목록 가져오기
    const subscriptions = await this.librarySubscriptionRepository.find({
      where: { subscriberId: userId },
      relations: ['library'],
    });

    // 구독 중인 서재가 없으면 빈 배열 반환
    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    // 서재 ID 목록
    const libraryIds = subscriptions.map((sub) => sub.libraryId);

    // 서재 정보 가져오기 (공개 서재만)
    const libraries = await this.libraryRepository.find({
      where: {
        id: In(libraryIds),
        isPublic: true,
      },
      relations: ['owner', 'tags', 'libraryBooks', 'libraryBooks.book'],
    });

    return Promise.all(
      libraries.map(async (library) => {
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
          tags: library.tags
            ? library.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                libraryId: tag.libraryId,
                createdAt: tag.createdAt,
              }))
            : [],
          bookCount: library.libraryBooks ? library.libraryBooks.length : 0,
          previewBooks,
          isSubscribed: true, // 구독 중인 서재들이므로 true
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );
  }

  // 특정 서재 상세 조회
  async findOne(
    id: number,
    userId?: number,
  ): Promise<LibraryDetailResponseDto> {
    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: [
        'owner',
        'libraryBooks',
        'libraryBooks.book',
        'tags',
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
      const subscription = await this.librarySubscriptionRepository.findOne({
        where: {
          libraryId: id,
          subscriberId: userId,
        },
      });
      isSubscribed = !!subscription;
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

    // 최근 업데이트 이력
    const recentUpdates = library.updateHistory
      ? library.updateHistory
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5) // 최근 5개만 가져오기
          .map((update) => ({
            date: update.createdAt,
            message: update.message,
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
      tags: library.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
        libraryId: tag.libraryId,
        createdAt: tag.createdAt,
      })),
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
    Object.assign(library, updateLibraryDto);
    const updatedLibrary = await this.libraryRepository.save(library);

    // 서재 정보 업데이트 이력 추가
    let updateMessage = `서재 정보가 업데이트되었습니다.`;
    if (oldName !== updatedLibrary.name) {
      updateMessage = `서재 이름이 "${oldName}"에서 "${updatedLibrary.name}"로 변경되었습니다.`;
    }
    await this.addUpdateHistory(id, updateMessage);

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

    // 관련된 libraryBooks, tags, subscriptions, updateHistory 먼저 삭제
    await this.libraryBookRepository.delete({ libraryId: id });
    await this.libraryTagRepository.delete({ libraryId: id });
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
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId },
    });

    if (!library) {
      throw new NotFoundException(`서재 ID ${libraryId}를 찾을 수 없습니다.`);
    }

    if (library.ownerId !== userId) {
      throw new ForbiddenException('이 서재에 책을 추가할 권한이 없습니다.');
    }

    const book = await this.bookService.findById(addBookToLibraryDto.bookId);

    // 이미 서재에 해당 책이 있는지 확인
    const existingBook = await this.libraryBookRepository.findOne({
      where: {
        libraryId,
        bookId: addBookToLibraryDto.bookId,
      },
    });

    if (existingBook) {
      throw new BadRequestException('이미 서재에 추가된 책입니다.');
    }

    const libraryBook = this.libraryBookRepository.create({
      library,
      libraryId,
      book,
      bookId: addBookToLibraryDto.bookId,
      note: addBookToLibraryDto.note,
    });

    const savedLibraryBook = await this.libraryBookRepository.save(libraryBook);

    // 책 추가 이력
    await this.addUpdateHistory(
      libraryId,
      `"${book.title}" 책이 서재에 추가되었습니다.`,
    );

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
        isbn: book.isbn,
        publisher: book.publisher,
      },
      createdAt: savedLibraryBook.createdAt,
    };
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
      `"${bookTitle}" 책이 서재에서 제거되었습니다.`,
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

    // 이미 서재에 해당 태그가 있는지 확인
    const existingTag = await this.libraryTagRepository.findOne({
      where: {
        libraryId,
        name: addTagToLibraryDto.name,
      },
    });

    if (existingTag) {
      throw new BadRequestException('이미 서재에 추가된 태그입니다.');
    }

    const libraryTag = this.libraryTagRepository.create({
      library,
      libraryId,
      name: addTagToLibraryDto.name,
    });

    const savedLibraryTag = await this.libraryTagRepository.save(libraryTag);

    // 태그 추가 이력
    await this.addUpdateHistory(
      libraryId,
      `"${addTagToLibraryDto.name}" 태그가 서재에 추가되었습니다.`,
    );

    return {
      id: savedLibraryTag.id,
      name: savedLibraryTag.name,
      libraryId: savedLibraryTag.libraryId,
      createdAt: savedLibraryTag.createdAt,
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

    const tag = await this.libraryTagRepository.findOne({
      where: {
        id: tagId,
        libraryId,
      },
    });

    if (!tag) {
      throw new NotFoundException(
        `태그 ID ${tagId}를 서재에서 찾을 수 없습니다.`,
      );
    }

    const tagName = tag.name;
    await this.libraryTagRepository.remove(tag);

    // 태그 제거 이력
    await this.addUpdateHistory(
      libraryId,
      `"${tagName}" 태그가 서재에서 제거되었습니다.`,
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
      `${user.username}님이 서재를 구독했습니다.`,
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
      `${userName}님이 서재 구독을 취소했습니다.`,
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
      date: update.createdAt,
      message: update.message,
    }));
  }

  // 업데이트 이력 추가
  async addUpdateHistory(libraryId: number, message: string): Promise<void> {
    const updateHistory = this.libraryUpdateHistoryRepository.create({
      libraryId,
      message,
    });

    await this.libraryUpdateHistoryRepository.save(updateHistory);
  }

  // 사용자가 서재를 구독 중인지 확인
  private async isUserSubscribed(
    userId: number,
    libraryId: number,
  ): Promise<boolean> {
    const subscription = await this.librarySubscriptionRepository.findOne({
      where: {
        libraryId,
        subscriberId: userId,
      },
    });

    return !!subscription;
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
}
