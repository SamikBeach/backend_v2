import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { join } from 'path';
import * as express from 'express';
import * as qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      credentials: true,
      origin: [process.env.SERVICE_URL, process.env.SERVICE_URL_WITH_WWW],
    },
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });

  app.set('query parser', 'extended');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const logger = new Logger('Bootstrap');

  // 정적 파일 서빙 설정 (업로드된 이미지)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '2',
  });

  // Add validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 전역 가드 적용
  const jwtAuthGuard = app.get(JwtAuthGuard);
  app.useGlobalGuards(jwtAuthGuard);

  // Express 쿼리 파서 설정 - 배열 형태의 쿼리 파라미터 처리를 위해
  app.use((req, res, next) => {
    // req.query를 qs 라이브러리로 직접 파싱하여 배열 형태의 쿼리 파라미터 처리
    if (req.url.includes('?')) {
      const queryString = req.url.split('?')[1];
      req.query = qs.parse(queryString, {
        arrayLimit: 100,
        depth: 10,
      });
    }
    next();
  });

  // Express 미들웨어 설정
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
