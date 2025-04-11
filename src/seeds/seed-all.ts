import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import * as childProcess from 'child_process';
import * as util from 'util';

const exec = util.promisify(childProcess.exec);

async function bootstrap() {
  const logger = new Logger('SeedAll');
  logger.log('모든 시드 작업 시작...');

  try {
    // 1. 카테고리 데이터 시드
    logger.log('카테고리 데이터 시드 작업 시작...');
    await exec('yarn seed:categories');
    logger.log('카테고리 데이터 시드 작업 완료!');

    // 2. 책 데이터 시드
    logger.log('책 데이터 시드 작업 시작...');
    await exec('yarn seed:books');
    logger.log('책 데이터 시드 작업 완료!');

    // 3. 디스커버 카테고리 데이터 시드
    logger.log('디스커버 카테고리 데이터 시드 작업 시작...');
    await exec('yarn seed:discover-category');
    logger.log('디스커버 카테고리 데이터 시드 작업 완료!');

    // 4. 태그 데이터 시드
    logger.log('태그 데이터 시드 작업 시작...');
    await exec('yarn seed:tag');
    logger.log('태그 데이터 시드 작업 완료!');

    // 5. 사용자 데이터 시드
    logger.log('사용자 데이터 시드 작업 시작...');
    await exec('yarn seed:user');
    logger.log('사용자 데이터 시드 작업 완료!');

    // 6. 라이브러리 데이터 시드 (사용자 이후에 실행)
    logger.log('라이브러리 데이터 시드 작업 시작...');
    await exec('yarn seed:library');
    logger.log('라이브러리 데이터 시드 작업 완료!');

    logger.log('모든 시드 작업이 성공적으로 완료되었습니다! 🎉');
  } catch (error) {
    logger.error(`시드 작업 중 오류 발생: ${error.message}`);
    logger.error(`${error.stdout}`);
    process.exit(1);
  }
}

bootstrap();
