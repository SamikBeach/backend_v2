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

  // 샘플 검색어 배열
  const searchTerms = [
    '철학',
    '플라톤',
    '소크라테스',
    '아리스토텔레스',
    '니체',
    '공자',
    '노자',
    '문학',
    '셰익스피어',
    '도스토예프스키',
    '톨스토이',
    '괴테',
    '프루스트',
    '역사',
    '동양사',
    '서양사',
    '국가',
    '민주주의',
    '법',
    '헌법',
    '경제',
    '자본주의',
    '사회주의',
    '심리학',
    '종교',
    '과학',
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
    for (const term of searchTerms) {
      // 인기 검색어일수록 더 많은 로그 생성
      const popularity = Math.random() * 10;
      const logCount = Math.floor(popularity * 5); // 0~50개 사이의 로그 생성

      for (let i = 0; i < logCount; i++) {
        // 랜덤 날짜와 유저 선택
        const createdAt =
          pastDates[Math.floor(Math.random() * pastDates.length)];
        const userId = userIds[Math.floor(Math.random() * userIds.length)];

        const log = searchLogRepository.create({
          term,
          userId,
          createdAt,
        });

        searchLogs.push(log);
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
      // 각 사용자에게 5개의 랜덤 검색어 할당
      const userSearchTerms = [...searchTerms]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      // 최근 검색어 순서대로 저장 (최신 순)
      for (let i = 0; i < userSearchTerms.length; i++) {
        const term = userSearchTerms[i];
        const createdAt = new Date();
        createdAt.setMinutes(createdAt.getMinutes() - i * 10); // 10분 간격

        const recentSearch = recentSearchRepository.create({
          userId,
          term,
          createdAt,
        });

        await recentSearchRepository.save(recentSearch);
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
