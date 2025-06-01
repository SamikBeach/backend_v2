import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Book } from '../book/entities/book.entity';
import { ImageAnalyzerService } from '../book/image-analyzer.service';

async function bootstrap() {
  const logger = new Logger('BookCoverImageDimensionsSeed');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    logger.log('책 커버 이미지 크기 분석 및 업데이트 시작...');

    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));
    const imageAnalyzerService =
      app.get<ImageAnalyzerService>(ImageAnalyzerService);

    // 커버 이미지는 있지만 크기 정보가 없는 책들을 조회
    const booksWithoutDimensions = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .andWhere(
        '(book.coverImageWidth IS NULL OR book.coverImageHeight IS NULL)',
      )
      .getMany();

    logger.log(
      `크기 정보가 없는 커버 이미지를 가진 책: ${booksWithoutDimensions.length}권`,
    );

    if (booksWithoutDimensions.length === 0) {
      logger.log('모든 책의 커버 이미지 크기 정보가 이미 존재합니다.');
      return;
    }

    // 배치 크기 설정 (한 번에 너무 많은 요청을 보내지 않도록)
    const batchSize = 10;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < booksWithoutDimensions.length; i += batchSize) {
      const batch = booksWithoutDimensions.slice(i, i + batchSize);

      logger.log(
        `배치 ${Math.floor(i / batchSize) + 1} 처리 중... (${i + 1}-${Math.min(i + batchSize, booksWithoutDimensions.length)}/${booksWithoutDimensions.length})`,
      );

      // 배치 내 책들의 이미지 크기 분석
      const imageUrls = batch.map((book) => book.coverImage);
      const dimensionsResults =
        await imageAnalyzerService.getMultipleImageDimensions(imageUrls);

      // 결과를 데이터베이스에 업데이트
      for (let j = 0; j < batch.length; j++) {
        const book = batch[j];
        const dimensions = dimensionsResults[j];

        try {
          if (dimensions.width && dimensions.height) {
            await bookRepository.update(book.id, {
              coverImageWidth: dimensions.width,
              coverImageHeight: dimensions.height,
            });

            logger.log(
              `✅ 책 "${book.title}" (ID: ${book.id}) 커버 이미지 크기 업데이트: ${dimensions.width}x${dimensions.height}`,
            );
            successCount++;
          } else {
            logger.warn(
              `⚠️ 책 "${book.title}" (ID: ${book.id}) 커버 이미지 크기 분석 실패: ${book.coverImage}`,
            );
            failedCount++;
          }
        } catch (error) {
          logger.error(
            `❌ 책 "${book.title}" (ID: ${book.id}) 업데이트 중 오류: ${error.message}`,
          );
          failedCount++;
        }

        processedCount++;
      }

      // 배치 간 잠시 대기 (API 레이트 리밋 방지)
      if (i + batchSize < booksWithoutDimensions.length) {
        logger.log('다음 배치 처리를 위해 2초 대기...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    logger.log('='.repeat(50));
    logger.log('📊 커버 이미지 크기 업데이트 완료!');
    logger.log(`총 처리된 책: ${processedCount}권`);
    logger.log(`성공: ${successCount}권`);
    logger.log(`실패: ${failedCount}권`);
    logger.log('='.repeat(50));

    // 업데이트 후 통계 확인
    const totalBooksWithCover = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .getCount();

    const booksWithDimensions = await bookRepository
      .createQueryBuilder('book')
      .where('book.coverImage IS NOT NULL')
      .andWhere('book.coverImage != :empty', { empty: '' })
      .andWhere('book.coverImageWidth IS NOT NULL')
      .andWhere('book.coverImageHeight IS NOT NULL')
      .getCount();

    logger.log(`📈 최종 통계:`);
    logger.log(`커버 이미지가 있는 총 책 수: ${totalBooksWithCover}권`);
    logger.log(`크기 정보가 있는 책 수: ${booksWithDimensions}권`);
    logger.log(
      `완료율: ${((booksWithDimensions / totalBooksWithCover) * 100).toFixed(1)}%`,
    );
  } catch (error) {
    logger.error(`시드 실행 중 오류 발생: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
