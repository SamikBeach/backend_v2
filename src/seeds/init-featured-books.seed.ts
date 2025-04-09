import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookService } from '../book/book.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BookSeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookService = app.get(BookService);

  // 카테고리 ID를 숫자로 정의
  const categories = [
    1, // philosophy
    2, // literature
    3, // history
    4, // political
    5, // economics
    6, // society
    7, // science
    8, // religion
  ];

  try {
    // 각 카테고리별로 인기 도서 초기화
    for (const categoryId of categories) {
      logger.log(`카테고리 ID ${categoryId} 인기 도서 초기화 중...`);

      try {
        const books = await bookService.initializeFeaturedBooksByCategory(
          categoryId,
          10,
        );
        logger.log(
          `카테고리 ID ${categoryId}: ${books.length}개 도서 초기화 완료`,
        );
      } catch (error) {
        logger.error(
          `카테고리 ID ${categoryId} 도서 초기화 중 오류: ${error.message}`,
        );
      }
    }

    logger.log('모든 카테고리 인기 도서 초기화 완료!');
  } catch (error) {
    logger.error(`도서 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
