import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ReadingStatus,
  ReadingStatusType,
} from '../reading-status/entities/reading-status.entity';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';

interface ReadingStatusSeed {
  userId: number;
  bookId: number;
  status: ReadingStatusType;
  startDate?: Date;
  finishDate?: Date;
  currentPage?: number;
  readingMemo?: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('ReadingStatusSeed');

  try {
    logger.log('독서 상태 데이터 생성 시작...');

    const readingStatusRepository = app.get<Repository<ReadingStatus>>(
      getRepositoryToken(ReadingStatus),
    );
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));

    // 기존 독서 상태 데이터 확인
    const existingReadingStatuses = await readingStatusRepository.find();

    if (existingReadingStatuses.length > 0) {
      logger.log(
        `이미 ${existingReadingStatuses.length}개의 독서 상태 데이터가 존재합니다. 스킵합니다.`,
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

    // 독서 상태 시드 데이터 정의 (userId 1과 11만 사용)
    const readingStatusSeeds: ReadingStatusSeed[] = [
      {
        userId: 1,
        bookId: 1,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-01-01'),
        finishDate: new Date('2023-01-15'),
        currentPage: 320,
        readingMemo:
          '우주에 대한 새로운 시각을 얻게 된 책. 특히 4장이 인상적이었다.',
      },
      {
        userId: 1,
        bookId: 2,
        status: ReadingStatusType.READING,
        startDate: new Date('2023-02-01'),
        currentPage: 150,
        readingMemo:
          '개발자로서 사고방식을 정립하는데 도움이 되는 내용이 많다.',
      },
      {
        userId: 1,
        bookId: 3,
        status: ReadingStatusType.WANT_TO_READ,
      },
      {
        userId: 11,
        bookId: 2,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-01-05'),
        finishDate: new Date('2023-01-20'),
        currentPage: 350,
        readingMemo: '최고의 책! 개발자라면 꼭 읽어보세요.',
      },
      {
        userId: 11,
        bookId: 4,
        status: ReadingStatusType.READING,
        startDate: new Date('2023-03-01'),
        currentPage: 75,
        readingMemo: '어려운 내용이지만 차근차근 읽고 있습니다.',
      },
      {
        userId: 1,
        bookId: 5,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-03-01'),
        finishDate: new Date('2023-03-25'),
        currentPage: 300,
        readingMemo:
          '전반적으로 좋았지만 일부 내용은 너무 기초적인 수준이었습니다.',
      },
      {
        userId: 11,
        bookId: 6,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-02-15'),
        finishDate: new Date('2023-03-10'),
        currentPage: 400,
        readingMemo:
          '우주와 과학에 대한 궁금증을 해소해주는 명작입니다. 칼 세이건의 문체가 아름다워요.',
      },
      {
        userId: 1,
        bookId: 7,
        status: ReadingStatusType.READING,
        startDate: new Date('2023-04-01'),
        currentPage: 120,
        readingMemo:
          '프로그래밍 학습과 인지 과학을 연결해주는 내용이 흥미롭습니다.',
      },
      {
        userId: 11,
        bookId: 8,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-01-10'),
        finishDate: new Date('2023-02-05'),
        currentPage: 450,
        readingMemo:
          '마틴 아저씨의 조언이 실제 코딩에 많은 도움이 되었습니다. 코드 리팩토링 파트가 특히 유용했어요.',
      },
      {
        userId: 1,
        bookId: 9,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-03-05'),
        finishDate: new Date('2023-04-01'),
        currentPage: 320,
        readingMemo:
          '실무에 바로 적용할 수 있는 데이터 과학 기법들을 배울 수 있었습니다.',
      },
      {
        userId: 11,
        bookId: 10,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-02-20'),
        finishDate: new Date('2023-04-01'),
        currentPage: 500,
        readingMemo:
          '인공지능의 기본 원리부터 최신 트렌드까지 포괄적으로 다루고 있어요. 다만 수학적 내용이 어려웠습니다.',
      },
      {
        userId: 1,
        bookId: 4,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-01-20'),
        finishDate: new Date('2023-02-15'),
        currentPage: 280,
        readingMemo:
          '비전공자도 이해하기 쉽게 설명된 데이터 분석 입문서. 그래프와 도표가 특히 유용했습니다.',
      },
      {
        userId: 11,
        bookId: 3,
        status: ReadingStatusType.READ,
        startDate: new Date('2023-03-15'),
        finishDate: new Date('2023-04-10'),
        currentPage: 300,
        readingMemo:
          '코드 품질 향상에 실질적인 도움이 되는 책입니다. 이제 동료들이 제 코드를 칭찬해요.',
      },
      {
        userId: 1,
        bookId: 6, // 코스모스
        status: ReadingStatusType.READING,
        startDate: new Date('2023-04-01'),
        currentPage: 180,
        readingMemo: '우주의 신비를 알기 쉽게 설명해주는 명저입니다.',
      },
      {
        userId: 11,
        bookId: 7, // 프로그래머의 뇌
        status: ReadingStatusType.WANT_TO_READ,
      },
      {
        userId: 1,
        bookId: 8, // 클린 코드
        status: ReadingStatusType.READ,
        startDate: new Date('2023-01-15'),
        finishDate: new Date('2023-02-10'),
        currentPage: 450,
        readingMemo:
          '개발자라면 꼭 읽어야 할 바이블입니다. 코드 작성 습관이 달라졌어요.',
      },
      {
        userId: 11,
        bookId: 9, // 데이터 과학 입문
        status: ReadingStatusType.READING,
        startDate: new Date('2023-03-15'),
        currentPage: 120,
        readingMemo:
          '새롭게 데이터 과학을 배우는 중입니다. 실용적인 예제가 많아서 좋네요.',
      },
      {
        userId: 1,
        bookId: 10, // 인공지능: 현대적 접근
        status: ReadingStatusType.WANT_TO_READ,
      },
    ];

    // 독서 상태 데이터 생성
    for (const seedData of readingStatusSeeds) {
      const user = await userRepository.findOne({
        where: { id: seedData.userId },
      });
      if (!user) {
        logger.warn(
          `사용자를 찾을 수 없습니다: ID ${seedData.userId}. 이 독서 상태는 건너뜁니다.`,
        );
        continue;
      }

      const book = await bookRepository.findOne({
        where: { id: seedData.bookId },
      });
      if (!book) {
        logger.warn(
          `책을 찾을 수 없습니다: ID ${seedData.bookId}. 이 독서 상태는 건너뜁니다.`,
        );
        continue;
      }

      const readingStatus = new ReadingStatus();
      readingStatus.userId = user.id;
      readingStatus.bookId = book.id;
      readingStatus.status = seedData.status;

      if (seedData.startDate) readingStatus.startDate = seedData.startDate;
      if (seedData.finishDate) readingStatus.finishDate = seedData.finishDate;
      if (seedData.currentPage)
        readingStatus.currentPage = seedData.currentPage;
      if (seedData.readingMemo)
        readingStatus.readingMemo = seedData.readingMemo;

      await readingStatusRepository.save(readingStatus);
    }

    logger.log(`${readingStatusSeeds.length}개의 독서 상태 데이터 생성 완료!`);
  } catch (error) {
    logger.error(`독서 상태 시드 데이터 생성 중 오류 발생: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
