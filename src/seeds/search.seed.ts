import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SearchLog,
  PopularSearch,
  RecentSearch,
} from '../search/search.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SearchSeed');

  // 검색 레포지토리 가져오기
  const searchLogRepository = app.get<Repository<SearchLog>>(
    getRepositoryToken(SearchLog),
  );
  const popularSearchRepository = app.get<Repository<PopularSearch>>(
    getRepositoryToken(PopularSearch),
  );
  const recentSearchRepository = app.get<Repository<RecentSearch>>(
    getRepositoryToken(RecentSearch),
  );

  // 기존 검색 로그 개수 확인
  const existingLogs = await searchLogRepository.count();
  const existingPopular = await popularSearchRepository.count();
  const existingRecent = await recentSearchRepository.count();

  if (existingLogs > 0 || existingPopular > 0 || existingRecent > 0) {
    logger.log(
      `이미 ${existingLogs}개의 검색 로그, ${existingPopular}개의 인기 검색어, ${existingRecent}개의 최근 검색어가 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  logger.log('검색 이력 데이터 시드 작업을 시작합니다...');

  // 샘플 검색어와 관련 책 정보
  const searchTermsWithBooks = [
    {
      term: '철학',
      bookInfo: {
        bookId: 1001,
        title: '서양철학사',
        author: '버트런드 러셀',
        coverImage: 'https://example.com/covers/philosophy_history.jpg',
        publisher: '동서문화사',
        description:
          '서양 철학의 역사를 다룬 명저로, 고대 그리스 철학부터 현대 철학까지의 흐름을 조망합니다.',
      },
    },
    {
      term: '플라톤',
      bookInfo: {
        bookId: 1002,
        title: '국가',
        author: '플라톤',
        coverImage: 'https://example.com/covers/republic.jpg',
        publisher: '문예출판사',
        description:
          '플라톤의 대표작으로 이상적인 국가와 정의로운 삶에 대해 논합니다.',
      },
    },
    {
      term: '소크라테스',
      bookInfo: {
        bookId: 1003,
        title: '소크라테스의 변명',
        author: '플라톤',
        coverImage: 'https://example.com/covers/apology.jpg',
        publisher: '문학동네',
        description:
          '소크라테스의 재판에서의 변론을 기록한 플라톤의 작품입니다.',
      },
    },
    {
      term: '아리스토텔레스',
      bookInfo: {
        bookId: 1004,
        title: '니코마코스 윤리학',
        author: '아리스토텔레스',
        coverImage: 'https://example.com/covers/nicomachean_ethics.jpg',
        publisher: '이카루스',
        description: '아리스토텔레스의 윤리학 사상을 담은 대표적인 저작입니다.',
      },
    },
    {
      term: '니체',
      bookInfo: {
        bookId: 1005,
        title: '차라투스트라는 이렇게 말했다',
        author: '프리드리히 니체',
        coverImage: 'https://example.com/covers/zarathustra.jpg',
        publisher: '민음사',
        description: '니체의 대표작으로 초인 개념과 신의 죽음에 대해 논합니다.',
      },
    },
    {
      term: '공자',
      bookInfo: {
        bookId: 1006,
        title: '논어',
        author: '공자',
        coverImage: 'https://example.com/covers/analects.jpg',
        publisher: '동양출판사',
        description:
          '공자의 가르침과 제자들과의 대화를 기록한 동양 고전입니다.',
      },
    },
    {
      term: '노자',
      bookInfo: {
        bookId: 1007,
        title: '도덕경',
        author: '노자',
        coverImage: 'https://example.com/covers/tao_te_ching.jpg',
        publisher: '현대사상사',
        description: '도가 철학의 핵심 사상을 담은 노자의 저작입니다.',
      },
    },
    {
      term: '문학',
      bookInfo: {
        bookId: 1008,
        title: '문학이란 무엇인가',
        author: '테리 이글턴',
        coverImage: 'https://example.com/covers/literary_theory.jpg',
        publisher: '산지니',
        description: '문학의 본질과 이론에 대한 흥미로운 탐구를 담고 있습니다.',
      },
    },
    {
      term: '셰익스피어',
      bookInfo: {
        bookId: 1009,
        title: '햄릿',
        author: '윌리엄 셰익스피어',
        coverImage: 'https://example.com/covers/hamlet.jpg',
        publisher: '민음사',
        description:
          '셰익스피어의 4대 비극 중 하나로, 덴마크 왕자 햄릿의 복수를 다룹니다.',
      },
    },
    {
      term: '도스토예프스키',
      bookInfo: {
        bookId: 1010,
        title: '죄와 벌',
        author: '표도르 도스토예프스키',
        coverImage: 'https://example.com/covers/crime_and_punishment.jpg',
        publisher: '민음사',
        description: '러시아 문학의 대표작으로, 살인과 양심의 갈등을 다룹니다.',
      },
    },
    {
      term: '톨스토이',
      bookInfo: {
        bookId: 1011,
        title: '전쟁과 평화',
        author: '레프 톨스토이',
        coverImage: 'https://example.com/covers/war_and_peace.jpg',
        publisher: '열린책들',
        description:
          '나폴레옹의 러시아 침공을 배경으로 한 톨스토이의 대작입니다.',
      },
    },
    {
      term: '괴테',
      bookInfo: {
        bookId: 1012,
        title: '파우스트',
        author: '요한 볼프강 폰 괴테',
        coverImage: 'https://example.com/covers/faust.jpg',
        publisher: '문학과지성사',
        description:
          '영혼을 악마에게 판 학자 파우스트의 이야기를 담은 독일 문학의 대표작입니다.',
      },
    },
    {
      term: '프루스트',
      bookInfo: {
        bookId: 1013,
        title: '잃어버린 시간을 찾아서',
        author: '마르셀 프루스트',
        coverImage: 'https://example.com/covers/remembrance.jpg',
        publisher: '민음사',
        description:
          '기억과 예술, 삶의 의미를 탐구하는 20세기 문학의 걸작입니다.',
      },
    },
    {
      term: '역사',
      bookInfo: {
        bookId: 1014,
        title: '역사란 무엇인가',
        author: 'E.H. 카',
        coverImage: 'https://example.com/covers/what_is_history.jpg',
        publisher: '까치',
        description: '역사학의 본질과 역사가의 역할에 대해 다룬 명저입니다.',
      },
    },
    {
      term: '동양사',
      bookInfo: null,
    },
    {
      term: '서양사',
      bookInfo: null,
    },
    {
      term: '국가',
      bookInfo: null,
    },
    {
      term: '민주주의',
      bookInfo: null,
    },
    {
      term: '법',
      bookInfo: null,
    },
    {
      term: '헌법',
      bookInfo: null,
    },
    {
      term: '경제',
      bookInfo: null,
    },
    {
      term: '자본주의',
      bookInfo: null,
    },
    {
      term: '사회주의',
      bookInfo: null,
    },
    {
      term: '심리학',
      bookInfo: null,
    },
    {
      term: '종교',
      bookInfo: null,
    },
    {
      term: '과학',
      bookInfo: null,
    },
  ];

  // 시간 간격을 두고 검색 이력을 생성하기 위한 날짜 배열
  const pastDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date;
  });

  // 유저 ID 배열 (테스트 계정)
  const userIds = [1, 2, 3, null, null]; // null은 비로그인 사용자

  try {
    // 검색 로그 생성
    const searchLogs = [];
    let totalCount = 0;

    // 각 검색어에 대해 여러 번의 검색 로그 생성
    for (const searchItem of searchTermsWithBooks) {
      const { term, bookInfo } = searchItem;

      // 인기 검색어일수록 더 많은 로그 생성
      const popularity = Math.random() * 10;
      const logCount = Math.floor(popularity * 5); // 0~50개 사이의 로그 생성

      for (let i = 0; i < logCount; i++) {
        // 랜덤 날짜와 유저 선택
        const createdAt =
          pastDates[Math.floor(Math.random() * pastDates.length)];
        const userId = userIds[Math.floor(Math.random() * userIds.length)];

        // 기본 로그 생성
        const log = {
          term,
          userId,
          createdAt,
        };

        // 책 정보가 있는 경우에만 추가
        if (bookInfo) {
          Object.assign(log, {
            bookId: bookInfo.bookId,
            title: bookInfo.title,
            author: bookInfo.author,
            coverImage: bookInfo.coverImage,
            publisher: bookInfo.publisher,
            description: bookInfo.description,
          });
        }

        searchLogs.push(searchLogRepository.create(log));
        totalCount++;

        // 100개씩 나누어 저장
        if (searchLogs.length >= 100) {
          await searchLogRepository.save(searchLogs);
          searchLogs.length = 0; // 배열 비우기
        }
      }
    }

    // 남은 로그들 저장
    if (searchLogs.length > 0) {
      await searchLogRepository.save(searchLogs);
    }

    logger.log(`총 ${totalCount}개의 검색 로그가 생성되었습니다.`);

    // 인기 검색어 집계하여 저장
    logger.log('인기 검색어 집계 중...');
    const popularSearchTerms = await searchLogRepository
      .createQueryBuilder('search_log')
      .select('search_log.term', 'term')
      .addSelect('COUNT(*)', 'count')
      .groupBy('search_log.term')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // 인기 검색어 저장
    for (const { term, count } of popularSearchTerms) {
      const popularSearch = popularSearchRepository.create({
        term,
        count: parseInt(count),
      });

      await popularSearchRepository.save(popularSearch);
    }

    logger.log(
      `${popularSearchTerms.length}개의 인기 검색어가 생성되었습니다.`,
    );

    // 최근 검색어 생성
    logger.log('최근 검색어 생성 중...');

    // 각 유저별로 최대 5개의 최근 검색어 생성
    for (const userId of userIds.filter((id) => id !== null)) {
      // 각 사용자에게 5개의 랜덤 검색어 할당 (책 정보가 있는 항목 우선)
      const userSearchTerms = [...searchTermsWithBooks]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      // 최근 검색어 순서대로 저장 (최신 순)
      for (let i = 0; i < userSearchTerms.length; i++) {
        const { term, bookInfo } = userSearchTerms[i];
        const createdAt = new Date();
        createdAt.setMinutes(createdAt.getMinutes() - i * 10); // 10분 간격

        // 기본 최근 검색어 객체 생성
        const recentSearch = {
          userId,
          term,
          createdAt,
        };

        // 책 정보가 있는 경우 추가
        if (bookInfo) {
          Object.assign(recentSearch, {
            bookId: bookInfo.bookId,
            title: bookInfo.title,
            author: bookInfo.author,
            coverImage: bookInfo.coverImage,
            publisher: bookInfo.publisher,
            description: bookInfo.description,
          });
        }

        await recentSearchRepository.save(
          recentSearchRepository.create(recentSearch),
        );
      }
    }

    // 최근 검색어 수 확인
    const recentSearchCount = await recentSearchRepository.count();
    logger.log(`${recentSearchCount}개의 최근 검색어가 생성되었습니다.`);
  } catch (error) {
    logger.error(`검색 시드 작업 중 오류 발생: ${error.message}`);
  }

  logger.log('검색 이력 데이터 시드 작업 완료!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('시드 작업 중 오류가 발생했습니다:', err);
  process.exit(1);
});
