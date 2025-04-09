import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookService } from '../book/book.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BookSeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookService = app.get(BookService);

  const categories = [
    'philosophy',
    'literature',
    'history',
    'political',
    'economics',
    'society',
    'science',
    'religion',
  ];

  try {
    // 각 카테고리별로 인기 도서 초기화
    for (const categoryId of categories) {
      logger.log(`${categoryId} 카테고리 인기 도서 초기화 중...`);

      try {
        const books = await bookService.initializeFeaturedBooksByCategory(
          categoryId,
          10,
        );
        logger.log(
          `${categoryId} 카테고리: ${books.length}개 도서 초기화 완료`,
        );
      } catch (error) {
        logger.error(
          `${categoryId} 카테고리 도서 초기화 중 오류 발생: ${error.message}`,
        );
      }
    }

    logger.log('모든 카테고리 인기 도서 초기화 완료!');
  } catch (error) {
    logger.error(`도서 초기화 중 오류 발생: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
