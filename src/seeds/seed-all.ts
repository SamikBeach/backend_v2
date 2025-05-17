import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { execSync } from 'child_process';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('SeedAll');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    logger.log('전체 시드 데이터 생성 시작...');

    const seeds = [
      'user.seed.ts',
      'category.seed.ts',
      'book.seed.ts',
      'discover-category.seed.ts',
      'library-tag.seed.ts',
      'library.seed.ts',
      'review.seed.ts',
      'reading-status.seed.ts',
      'notification.seed.ts',
      'search.seed.ts',
    ];

    const nodeEnv = process.env.NODE_ENV || 'development';
    const basePath = path.join(__dirname);

    for (const seed of seeds) {
      logger.log(`실행 중: ${seed}`);
      try {
        execSync(
          `NODE_ENV=${nodeEnv} ts-node -r tsconfig-paths/register ${basePath}/${seed}`,
          {
            stdio: 'inherit',
          },
        );
        logger.log(`완료: ${seed}`);
      } catch (error) {
        logger.error(`시드 파일 실행 실패: ${seed}`);
        logger.error(error.message);
        // 다음 시드 파일 계속 실행
      }
    }

    logger.log('모든 시드 데이터 생성 완료!');
  } catch (error) {
    logger.error(`시드 중 오류 발생: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
