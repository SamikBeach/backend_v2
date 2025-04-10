import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Library } from '../library/entities/library.entity';
import { LibraryTag } from '../library/entities/library-tag.entity';
import { LibraryBook } from '../library/entities/library-book.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

interface TagSeed {
  name: string;
}

interface LibrarySeed {
  name: string;
  description: string;
  isPublic: boolean;
  tags: TagSeed[];
  bookCount: number; // 시드에 추가할 책 수
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('LibrarySeed');

  try {
    logger.log('라이브러리 초기 데이터 생성 시작...');

    // 라이브러리를 생성하기 위해 필요한 데이터 가져오기
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));
    const libraryRepository = app.get<Repository<Library>>(
      getRepositoryToken(Library),
    );
    const libraryTagRepository = app.get<Repository<LibraryTag>>(
      getRepositoryToken(LibraryTag),
    );
    const libraryBookRepository = app.get<Repository<LibraryBook>>(
      getRepositoryToken(LibraryBook),
    );
    const librarySubscriptionRepository = app.get<
      Repository<LibrarySubscription>
    >(getRepositoryToken(LibrarySubscription));

    // 기존 라이브러리 데이터 확인
    const existingLibraries = await libraryRepository.count();
    if (existingLibraries > 0) {
      logger.log(
        `이미 ${existingLibraries}개의 라이브러리가 존재합니다. 시드 작업을 건너뜁니다.`,
      );
      await app.close();
      return;
    }

    // 라이브러리 생성에 사용할 사용자 조회 (첫 번째 사용자)
    const users = await userRepository.find({ take: 3 });
    if (users.length === 0) {
      logger.error(
        '시드 데이터를 생성할 사용자가 없습니다. 먼저 사용자를 생성해주세요.',
      );
      await app.close();
      return;
    }

    // 라이브러리에 추가할 책 조회
    const books = await bookRepository.find({ take: 30 });
    if (books.length === 0) {
      logger.error(
        '시드 데이터를 생성할 책이 없습니다. 먼저 책을 생성해주세요.',
      );
      await app.close();
      return;
    }

    // 라이브러리 샘플 데이터
    const libraries: LibrarySeed[] = [
      {
        name: '철학 명저 모음',
        description: '철학 분야의 고전적인 명저들을 모아둔 라이브러리입니다.',
        isPublic: true,
        tags: [
          { name: '철학' },
          { name: '고전' },
          { name: '서양철학' },
          { name: '동양철학' },
        ],
        bookCount: 5,
      },
      {
        name: '문학 컬렉션',
        description: '세계 문학의 주요 작품들을 모아둔 개인 컬렉션입니다.',
        isPublic: true,
        tags: [
          { name: '문학' },
          { name: '소설' },
          { name: '시' },
          { name: '고전문학' },
        ],
        bookCount: 7,
      },
      {
        name: '역사 탐구',
        description: '역사 관련 주요 도서들을 정리해 둔 라이브러리입니다.',
        isPublic: false,
        tags: [{ name: '역사' }, { name: '세계사' }, { name: '한국사' }],
        bookCount: 4,
      },
      {
        name: '과학 교양서',
        description: '과학 관련 교양서적을 모아둔 컬렉션입니다.',
        isPublic: true,
        tags: [
          { name: '과학' },
          { name: '물리학' },
          { name: '생물학' },
          { name: '교양' },
        ],
        bookCount: 6,
      },
    ];

    // 각 사용자별로 라이브러리 생성
    for (let i = 0; i < Math.min(users.length, libraries.length); i++) {
      const user = users[i];
      const librarySeed = libraries[i];

      logger.log(
        `${user.email} 사용자를 위한 '${librarySeed.name}' 라이브러리 생성 중...`,
      );

      // 1. 라이브러리 생성
      const library = libraryRepository.create({
        name: librarySeed.name,
        description: librarySeed.description,
        isPublic: librarySeed.isPublic,
        owner: user,
        ownerId: user.id,
      });

      const savedLibrary = await libraryRepository.save(library);

      // 2. 라이브러리 태그 생성
      for (const tagSeed of librarySeed.tags) {
        const tag = libraryTagRepository.create({
          name: tagSeed.name,
          library: savedLibrary,
          libraryId: savedLibrary.id,
        });
        await libraryTagRepository.save(tag);
      }

      // 3. 라이브러리에 책 추가
      const booksToAdd = books.slice(0, librarySeed.bookCount);
      for (const book of booksToAdd) {
        const libraryBook = libraryBookRepository.create({
          library: savedLibrary,
          libraryId: savedLibrary.id,
          book,
          bookId: book.id,
          note: `${book.title}에 대한 메모입니다.`,
        });
        await libraryBookRepository.save(libraryBook);
      }

      // 4. 다른 사용자가 이 라이브러리를 구독하도록 설정
      if (librarySeed.isPublic) {
        // 주인을 제외한 다른 사용자들을 구독자로 추가
        for (const otherUser of users.filter((u) => u.id !== user.id)) {
          const subscription = librarySubscriptionRepository.create({
            library: savedLibrary,
            libraryId: savedLibrary.id,
            subscriber: otherUser,
            subscriberId: otherUser.id,
          });
          await librarySubscriptionRepository.save(subscription);

          // 구독자 수 업데이트
          savedLibrary.subscriberCount += 1;
        }

        // 구독자 수 저장
        await libraryRepository.save(savedLibrary);
      }

      logger.log(
        `'${librarySeed.name}' 라이브러리 생성 완료 (책: ${librarySeed.bookCount}권, 태그: ${librarySeed.tags.length}개)`,
      );
    }

    logger.log('라이브러리 초기 데이터 생성 완료!');
  } catch (error) {
    logger.error(`라이브러리 초기화 중 오류: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
