import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;

    // 요청 시간 기록
    const startTime = Date.now();

    // 응답 완료 후 로깅
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // 요청 데이터 정리
      const requestData = {
        params: req.params || {},
        query: req.query || {},
        body: req.body || {},
      };

      // 로그 스타일 포맷
      const colorReset = '\x1b[0m';
      const colorGreen = '\x1b[32m';
      const colorYellow = '\x1b[33m';
      const colorRed = '\x1b[31m';
      const colorCyan = '\x1b[36m';
      const colorMagenta = '\x1b[35m';

      // 상태 코드에 따른 색상 선택
      let colorStatus = colorGreen;
      if (statusCode >= 400 && statusCode < 500) {
        colorStatus = colorYellow;
      } else if (statusCode >= 500) {
        colorStatus = colorRed;
      }

      // 기본 로그 포맷
      const baseLogFormat = `${colorCyan}[API]${colorReset} ${colorMagenta}${method}${colorReset} ${originalUrl} ${colorStatus}${statusCode}${colorReset} ${responseTime}ms`;

      // 요청 정보 로깅
      const hasRequestData =
        Object.keys(requestData.params).length > 0 ||
        Object.keys(requestData.query).length > 0 ||
        Object.keys(requestData.body).length > 0;

      if (hasRequestData) {
        // params, query, body를 컴팩트하게 표시
        const compactData = {};

        if (Object.keys(requestData.params).length > 0) {
          compactData['params'] = requestData.params;
        }

        if (Object.keys(requestData.query).length > 0) {
          compactData['query'] = requestData.query;
        }

        if (Object.keys(requestData.body).length > 0) {
          compactData['body'] = requestData.body;
        }

        this.logger.log(
          `${baseLogFormat} | Request: ${JSON.stringify(compactData)}`,
        );
      } else {
        this.logger.log(baseLogFormat);
      }

      // 상태 코드에 따른 로그 레벨 선택
      if (statusCode >= 400 && statusCode < 500) {
        this.logger.warn(`Client Error: ${statusCode}`);
      } else if (statusCode >= 500) {
        this.logger.error(`Server Error: ${statusCode}`);
      }
    });

    next();
  }
}
