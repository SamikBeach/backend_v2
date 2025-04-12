import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from '../library/entities/library.entity';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';
import { Logger } from '@nestjs/common';
import { LibraryService } from '../library/library.service';
import { TagService } from '../tag/tag.service';
import { CreateLibraryDto } from '../library/dto/create-library.dto';
import { AddBookToLibraryDto } from '../library/dto/add-book-to-library.dto';
import { AddTagToLibraryDto } from '../library/dto/add-tag-to-library.dto';
import { Tag } from '../library/entities/tag.entity';

interface LibrarySeed {
  name: string;
  description: string;
  isPublic: boolean;
  tags: string[];
  bookCount: number;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('LibrarySeed');

  try {
    // Get repositories
    const libraryRepository = app.get<Repository<Library>>(
      getRepositoryToken(Library),
    );
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));
    const tagRepository = app.get<Repository<Tag>>(getRepositoryToken(Tag));
    const libraryService = app.get(LibraryService);
    const tagService = app.get(TagService);

    // Check if there are already libraries
    const existingLibraries = await libraryRepository.count();
    if (existingLibraries > 0) {
      logger.log('Libraries already exist. Skipping seed.');
      await app.close();
      return;
    }

    // Check if there are users
    const users = await userRepository.find();
    if (users.length === 0) {
      logger.log('No users found. Please seed users first.');
      await app.close();
      return;
    }

    // Check if there are books
    const books = await bookRepository.find();
    if (books.length === 0) {
      logger.log('No books found. Please seed books first.');
      await app.close();
      return;
    }

    logger.log('Starting library seed...');

    // 각 사용자별 라이브러리 예시 데이터
    const librarySeeds: { [key: string]: LibrarySeed[] } = {
      'user1@example.com': [
        {
          name: '철학 고전 모음',
          description: '철학 분야의 고전 명작들을 모아둔 라이브러리입니다.',
          isPublic: true,
          tags: ['철학', '고전', '필독서'],
          bookCount: 5,
        },
        {
          name: '읽고 싶은 책 목록',
          description: '향후 읽고 싶은 책들을 모아둔 개인 라이브러리입니다.',
          isPublic: false,
          tags: ['읽고 싶은 책'],
          bookCount: 3,
        },
      ],
      'user2@example.com': [
        {
          name: '과학 교양서 모음',
          description: '과학 분야의 대중적인 교양서를 모은 컬렉션입니다.',
          isPublic: true,
          tags: ['과학', '자연과학', '교양서'],
          bookCount: 4,
        },
        {
          name: '자기계발 도서',
          description: '자기계발과 생산성 향상에 관한 책들입니다.',
          isPublic: true,
          tags: ['자기계발', '비즈니스'],
          bookCount: 3,
        },
      ],
      'user3@example.com': [
        {
          name: '세계 문학 컬렉션',
          description: '세계 각국의 문학 작품을 모아둔 컬렉션입니다.',
          isPublic: true,
          tags: ['소설', '고전', '세계문학'],
          bookCount: 6,
        },
      ],
    };

    const bookIds = books.map((book) => book.id);
    const getRandomBookIds = (count: number): number[] => {
      const shuffled = [...bookIds].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, bookIds.length));
    };

    // 각 사용자에 대해 라이브러리 생성
    for (const user of users) {
      // 이 사용자에 대한 라이브러리 정의가 있는지 확인
      const userLibraries = librarySeeds[user.email] || [];

      if (userLibraries.length === 0) {
        // 정의된 라이브러리가 없으면 기본 라이브러리 1개 생성
        const defaultLibrary: LibrarySeed = {
          name: `${user.username || 'User'}'s Library`,
          description: `A collection of books curated by ${user.username || user.email}`,
          isPublic: Math.random() > 0.3, // 70% 확률로 공개
          tags: ['읽은 책'],
          bookCount: 3,
        };
        userLibraries.push(defaultLibrary);
      }

      logger.log(
        `Creating ${userLibraries.length} libraries for user ${user.username || user.email}`,
      );

      for (const librarySeed of userLibraries) {
        try {
          // 라이브러리 생성
          const libraryData: CreateLibraryDto = {
            name: librarySeed.name,
            description: librarySeed.description,
            isPublic: librarySeed.isPublic,
          };

          const library = await libraryService.create(user.id, libraryData);
          logger.log(`Created library: ${library.name}`);

          // 태그 추가
          for (const tagName of librarySeed.tags) {
            try {
              // 태그가 이미 존재하는지 확인하고 없으면 생성
              let tag = await tagRepository.findOne({
                where: { name: tagName },
              });
              if (!tag) {
                tag = await tagService.findOrCreateTag(tagName);
                logger.log(`Created new tag: ${tagName}`);
              }

              const tagDto: AddTagToLibraryDto = { name: tagName };
              await libraryService.addTagToLibrary(library.id, user.id, tagDto);
              logger.log(`Added tag ${tagName} to library ${library.name}`);
            } catch (error) {
              logger.error(`Error adding tag ${tagName}: ${error.message}`);
            }
          }

          // 책 추가
          const randomBookIds = getRandomBookIds(librarySeed.bookCount);
          for (const bookId of randomBookIds) {
            try {
              const bookDto: AddBookToLibraryDto = {
                bookId: bookId,
                note:
                  Math.random() > 0.5 ? `Note for book ${bookId}` : undefined,
              };
              await libraryService.addBookToLibrary(
                library.id,
                user.id,
                bookDto,
              );
              logger.log(`Added book ${bookId} to library ${library.name}`);
            } catch (error) {
              logger.error(`Error adding book ${bookId}: ${error.message}`);
            }
          }

          // 공개 라이브러리인 경우 구독자 추가
          if (librarySeed.isPublic) {
            const potentialSubscribers = users.filter((u) => u.id !== user.id);
            const subscriberCount = Math.min(
              Math.floor(Math.random() * 3) + 1,
              potentialSubscribers.length,
            );
            const shuffledUsers = [...potentialSubscribers].sort(
              () => 0.5 - Math.random(),
            );
            const subscribers = shuffledUsers.slice(0, subscriberCount);

            for (const subscriber of subscribers) {
              try {
                // 올바른 파라미터 순서로 호출 - libraryId, userId
                await libraryService.subscribeToLibrary(
                  library.id,
                  subscriber.id,
                );
                logger.log(
                  `User ${subscriber.username || subscriber.email} subscribed to library ${library.name}`,
                );
              } catch (error) {
                logger.error(
                  `Error subscribing user ${subscriber.email}: ${error.message}`,
                );
              }
            }
          }
        } catch (error) {
          logger.error(
            `Error creating library ${librarySeed.name}: ${error.message}`,
          );
        }
      }
    }

    logger.log('Library seed completed successfully!');
  } catch (error) {
    logger.error('Error during library seed:', error);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
