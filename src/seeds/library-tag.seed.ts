import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { LibraryTag } from '../library-tag/entities/library-tag.entity';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

interface TagSeed {
  name: string;
}

// 태그 정의: 분야별 분류 (10개 카테고리)
const majorFields: TagSeed[] = [
  { name: '철학' }, // Philosophy
  { name: '과학' }, // Science
  { name: '문학' }, // Literature
  { name: '역사' }, // History
  { name: '예술' }, // Arts
  { name: '경제학' }, // Economics
  { name: '심리학' }, // Psychology
  { name: '사회학' }, // Sociology
  { name: '정치학' }, // Political Science
  { name: '인문학' }, // Humanities
];

export const seedTags = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('LibraryTagSeed');
  const tagRepository = dataSource.getRepository(LibraryTag);

  // 기존 데이터 확인
  const existingCount = await tagRepository.count();
  if (existingCount > 0) {
    logger.log(
      `이미 ${existingCount}개의 라이브러리 태그가 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    return;
  }

  logger.log('라이브러리 태그 데이터 초기화 시작...');

  try {
    // 태그 추가
    for (const tagData of majorFields) {
      try {
        const tag = tagRepository.create({
          name: tagData.name,
          usageCount: Math.floor(Math.random() * 10), // 사용 횟수 랜덤 설정 (0-9)
        });
        await tagRepository.save(tag);
        logger.log(`'${tagData.name}' 라이브러리 태그 생성 완료`);
      } catch (error) {
        logger.error(
          `'${tagData.name}' 라이브러리 태그 생성 중 오류: ${error.message}`,
        );
      }
    }

    const finalCount = await tagRepository.count();
    logger.log(`총 ${finalCount}개의 라이브러리 태그 데이터 초기화 완료!`);
  } catch (error) {
    logger.error(`라이브러리 태그 초기화 중 오류: ${error.message}`);
  }
};

/**
 * 독립 실행 시 사용되는 함수
 */
async function bootstrap() {
  const logger = new Logger('LibraryTagSeed');
  logger.log('라이브러리 태그 시드 실행 시작...');

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const dataSource = app.get(DataSource);
    await seedTags(dataSource);
    logger.log('라이브러리 태그 시드 완료!');
  } catch (error) {
    logger.error(`라이브러리 태그 시드 중 오류: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

// 스크립트가 직접 실행된 경우 bootstrap 함수 실행
if (require.main === module) {
  bootstrap();
}
