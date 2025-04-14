import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';
import { Rating } from '../rating/entities/rating.entity';

// 평점 시드 데이터 인터페이스
interface RatingSeed {
  userId: number;
  bookId: number;
  rating: number;
  comment?: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('RatingSeed');

  try {
    logger.log('평점 데이터 생성 시작...');

    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));
    const ratingRepository = app.get<Repository<Rating>>(
      getRepositoryToken(Rating),
    );

    // 기존 평점 데이터 확인
    const existingRatings = await ratingRepository.find();

    if (existingRatings.length > 0) {
      logger.log(
        `이미 ${existingRatings.length}개의 평점 데이터가 존재합니다. 스킵합니다.`,
      );
      return;
    }

    // 사용자 ID 1번과 11번이 존재하는지 확인
    const user1 = await userRepository.findOne({ where: { id: 1 } });
    const user11 = await userRepository.findOne({ where: { id: 11 } });

    if (!user1 || !user11) {
      throw new Error(
        'userId 1 또는 userId 11이 존재하지 않습니다. 먼저 사용자 데이터를 생성하세요.',
      );
    }

    // 책 데이터 가져오기
    const books = await bookRepository.find();

    if (books.length === 0) {
      throw new Error(
        '책 데이터가 없습니다. 먼저 책 시드 데이터를 생성하세요.',
      );
    }

    // 평점 시드 데이터 정의 (userId 1과 11만 사용)
    const ratingSeeds: RatingSeed[] = [
      {
        userId: 1,
        bookId: 1,
        rating: 4,
        comment: '우주에 대한 새로운 시각을 얻게 된 책',
      },
      {
        userId: 11,
        bookId: 2,
        rating: 5,
        comment: '최고의 책! 개발자라면 꼭 읽어보세요.',
      },
      {
        userId: 1,
        bookId: 5,
        rating: 3,
        comment: '내용은 좋지만 번역이 조금 아쉬웠어요.',
      },
      {
        userId: 11,
        bookId: 3,
        rating: 4,
        comment:
          '정말 유익했습니다. 특히 클린 코드 작성 부분이 인상적이었어요.',
      },
      {
        userId: 1,
        bookId: 8,
        rating: 5,
        comment: '개발자라면 꼭 읽어야 할 바이블입니다.',
      },
      {
        userId: 11,
        bookId: 1,
        rating: 5,
        comment: '과학 서적 중 최고의 명작이라고 생각합니다.',
      },
      {
        userId: 1,
        bookId: 2,
        rating: 4,
        comment: '개발자로서 사고 과정을 이해하는데 큰 도움이 되었습니다.',
      },
      {
        userId: 11,
        bookId: 4,
        rating: 4,
        comment: '비전공자도 이해하기 쉽게 설명된 데이터 분석 입문서.',
      },
      {
        userId: 1,
        bookId: 6,
        rating: 5,
        comment: '우주와 과학에 대한 궁금증을 해소해주는 명작입니다.',
      },
      {
        userId: 11,
        bookId: 8,
        rating: 5,
        comment: '마틴 아저씨의 조언이 실제 코딩에 많은 도움이 되었습니다.',
      },
      {
        userId: 1,
        bookId: 9,
        rating: 4,
        comment:
          '실무에 바로 적용할 수 있는 데이터 과학 기법들을 배울 수 있었습니다.',
      },
      {
        userId: 11,
        bookId: 10,
        rating: 4,
        comment:
          '인공지능의 기본 원리부터 최신 트렌드까지 포괄적으로 다루고 있어요.',
      },
      {
        userId: 1,
        bookId: 3,
        rating: 5,
        comment: '코드 품질 향상에 실질적인 도움이 되는 책입니다.',
      },
      {
        userId: 11,
        bookId: 7,
        rating: 4,
        comment:
          '개발자의 인지 과정과 학습 방법에 대한 통찰력 있는 내용이 많았습니다.',
      },
    ];

    // 평점 데이터 생성
    for (const seedData of ratingSeeds) {
      const user = await userRepository.findOne({
        where: { id: seedData.userId },
      });
      if (!user) {
        logger.warn(
          `사용자를 찾을 수 없습니다: ID ${seedData.userId}. 이 평점은 건너뜁니다.`,
        );
        continue;
      }

      const book = await bookRepository.findOne({
        where: { id: seedData.bookId },
      });
      if (!book) {
        logger.warn(
          `책을 찾을 수 없습니다: ID ${seedData.bookId}. 이 평점은 건너뜁니다.`,
        );
        continue;
      }

      const rating = new Rating();
      rating.userId = user.id;
      rating.bookId = book.id;
      rating.rating = seedData.rating;
      if (seedData.comment) rating.comment = seedData.comment;

      await ratingRepository.save(rating);
    }

    // 각 책의 평점 업데이트
    for (const book of books) {
      const ratings = await ratingRepository.find({
        where: {
          bookId: book.id,
        },
      });

      if (ratings.length > 0) {
        const totalRating = ratings.reduce(
          (sum, item) => sum + Number(item.rating),
          0,
        );
        const avgRating = parseFloat((totalRating / ratings.length).toFixed(1));

        await bookRepository.update(book.id, {
          rating: avgRating,
          totalRatings: ratings.length,
        });
      }
    }

    logger.log(`${ratingSeeds.length}개의 평점 데이터 생성 완료!`);
  } catch (error) {
    logger.error(`평점 시드 데이터 생성 중 오류 발생: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
