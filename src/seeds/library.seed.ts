import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from '../library/entities/library.entity';
import { LibraryBook } from '../library/entities/library-book.entity';
import { LibraryTag } from '../library/entities/library-tag.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';
import { Logger } from '@nestjs/common';
import { LibraryService } from '../library/library.service';
import { CreateLibraryDto } from '../library/dto/create-library.dto';
import { AddBookToLibraryDto } from '../library/dto/add-book-to-library.dto';
import { AddTagToLibraryDto } from '../library/dto/add-tag-to-library.dto';

interface LibrarySeed {
  name: string;
  description: string;
  isPublic: boolean;
  tags: string[];
  bookIds: number[];
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
    const libraryService = app.get(LibraryService);

    // Check if there are already libraries
    const existingLibraries = await libraryRepository.count();
    if (existingLibraries > 0) {
      logger.log('Libraries already exist. Skipping seed.');
      await app.close();
      return;
    }

    // Check if there are users
    const users = await userRepository.find({ take: 5 });
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

    const bookIds = books.map((book) => book.id);
    const getRandomBookIds = (count: number): number[] => {
      const shuffled = [...bookIds].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    // Create library seeds for the first 5 users
    for (const user of users) {
      const libraryCount = Math.floor(Math.random() * 2) + 2; // 2-3 libraries per user

      logger.log(
        `Creating ${libraryCount} libraries for user ${user.username || user.email}`,
      );

      for (let i = 0; i < libraryCount; i++) {
        // Create a library
        const isPublic = Math.random() > 0.3; // 70% chance of being public
        const libraryData: CreateLibraryDto = {
          name: `${user.username || 'User'}'s Library ${i + 1}`,
          description: `A collection of books curated by ${user.username || user.email}`,
          isPublic,
        };

        // Create library with correct parameter order: userId, createLibraryDto
        const library = await libraryService.create(user.id, libraryData);
        logger.log(`Created library: ${library.name}`);

        // Add random tags (1-3 tags)
        const tagCount = Math.floor(Math.random() * 3) + 1;
        const tags = [
          'Fiction',
          'Non-Fiction',
          'Fantasy',
          'Science',
          'History',
          'Biography',
          'Self-Help',
          'Business',
        ];
        const shuffledTags = [...tags].sort(() => 0.5 - Math.random());
        const selectedTags = shuffledTags.slice(0, tagCount);

        for (const tag of selectedTags) {
          const tagDto: AddTagToLibraryDto = { name: tag };
          // Add tag with correct parameter order: libraryId, userId, tagDto
          await libraryService.addTagToLibrary(library.id, user.id, tagDto);
          logger.log(`Added tag ${tag} to library ${library.name}`);
        }

        // Add random books (3-8 books)
        const randomBookCount = Math.floor(Math.random() * 6) + 3;
        const randomBookIds = getRandomBookIds(randomBookCount);

        for (const bookId of randomBookIds) {
          const bookDto: AddBookToLibraryDto = {
            bookId: bookId,
            note: Math.random() > 0.5 ? `Note for book ${bookId}` : undefined,
          };
          // Add book with correct parameter order: libraryId, userId, bookDto
          await libraryService.addBookToLibrary(library.id, user.id, bookDto);
          logger.log(`Added book ${bookId} to library ${library.name}`);
        }

        // If public, add random subscribers (0-3 subscribers, excluding owner)
        if (isPublic) {
          const potentialSubscribers = users.filter((u) => u.id !== user.id);
          const subscriberCount = Math.min(
            Math.floor(Math.random() * 4),
            potentialSubscribers.length,
          );
          const shuffledUsers = [...potentialSubscribers].sort(
            () => 0.5 - Math.random(),
          );
          const subscribers = shuffledUsers.slice(0, subscriberCount);

          for (const subscriber of subscribers) {
            // Subscribe with correct parameter order: libraryId, userId
            await libraryService.subscribeToLibrary(subscriber.id, library.id);
            logger.log(
              `User ${subscriber.username || subscriber.email} subscribed to library ${library.name}`,
            );
          }
        }
      }
    }

    logger.log('Library seed completed successfully!');
  } catch (error) {
    logger.error('Error during library seed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
