import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from '../book/entities/book.entity';

async function bootstrap() {
  const logger = new Logger('TestBookCoverDimensionsSeed');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    logger.log('커버 이미지 크기 정보 테스트 시작...');

    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));

    // 커버 이미지 크기 정보가 있는 책들을 조회
    const booksWithDimensions = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .andWhere('book.coverImageWidth IS NOT NULL')
      .andWhere('book.coverImageHeight IS NOT NULL')
      .orderBy('book.id', 'DESC')
      .limit(10)
      .getMany();

    logger.log(`크기 정보가 있는 책들 (최근 10권):`);
    logger.log('='.repeat(80));

    booksWithDimensions.forEach((book, index) => {
      logger.log(`${index + 1}. "${book.title}" by ${book.author}`);
      logger.log(`   ID: ${book.id}`);
      logger.log(`   커버 이미지: ${book.coverImage}`);
      logger.log(`   크기: ${book.coverImageWidth}x${book.coverImageHeight}px`);
      logger.log(
        `   비율: ${(book.coverImageWidth / book.coverImageHeight).toFixed(2)}:1`,
      );
      logger.log('-'.repeat(80));
    });

    // 전체 통계
    const totalBooksWithCover = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .getCount();

    const booksWithDimensionsCount = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .andWhere('book.coverImageWidth IS NOT NULL')
      .andWhere('book.coverImageHeight IS NOT NULL')
      .getCount();

    const booksWithoutDimensionsCount = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .andWhere(
        '(book.coverImageWidth IS NULL OR book.coverImageHeight IS NULL)',
      )
      .getCount();

    logger.log('📊 전체 통계:');
    logger.log('='.repeat(50));
    logger.log(`커버 이미지가 있는 총 책 수: ${totalBooksWithCover}권`);
    logger.log(`크기 정보가 있는 책 수: ${booksWithDimensionsCount}권`);
    logger.log(`크기 정보가 없는 책 수: ${booksWithoutDimensionsCount}권`);
    logger.log(
      `완료율: ${((booksWithDimensionsCount / totalBooksWithCover) * 100).toFixed(1)}%`,
    );

    if (booksWithoutDimensionsCount > 0) {
      logger.log('');
      logger.log('💡 크기 정보가 없는 책들을 업데이트하려면:');
      logger.log('   yarn seed:book-cover-dimensions');
    }
  } catch (error) {
    logger.error(`테스트 실행 중 오류 발생: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
