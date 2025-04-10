import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runCommand(command: string, description: string): Promise<void> {
  const logger = new Logger(`Seed:${description}`);

  logger.log(`시작: ${description}...`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      logger.warn(stderr);
    }
    logger.log(`완료: ${description}`);
  } catch (error) {
    logger.error(`오류: ${error.message}`);
    // 에러가 발생해도 계속 진행
    logger.log('다음 단계로 진행합니다...');
  }
}

async function bootstrap() {
  const logger = new Logger('SeedAll');

  logger.log('전체 데이터 시드 프로세스를 시작합니다...');

  try {
    // 0. 사용자 데이터 시드 (가장 먼저 실행)
    await runCommand(
      'NODE_ENV=development ts-node src/seeds/user.seed.ts',
      '사용자 시드',
    );

    // 1. 카테고리 데이터 시드
    await runCommand(
      'NODE_ENV=development ts-node src/seeds/category.seed.ts',
      '카테고리 시드',
    );

    // 2. 도서 데이터 시드
    await runCommand(
      'NODE_ENV=development ts-node src/seeds/book.seed.ts',
      '도서 데이터 시드',
    );

    // 3. 발견하기 카테고리 시드
    await runCommand(
      'NODE_ENV=development ts-node src/seeds/discover-category.seed.ts',
      '발견하기 카테고리 시드',
    );

    // 4. 라이브러리 시드
    await runCommand(
      'NODE_ENV=development ts-node src/seeds/library.seed.ts',
      '라이브러리 시드',
    );

    logger.log('모든 시드 프로세스가 완료되었습니다!');
  } catch (error) {
    logger.error(`시드 프로세스 중 오류가 발생했습니다: ${error.message}`);
  }
}

bootstrap();
