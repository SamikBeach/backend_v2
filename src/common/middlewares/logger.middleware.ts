import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    // 요청 시간 기록
    const startTime = Date.now();

    // 응답 완료 후 로깅
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - startTime;

      const logFormat = `[${method}] ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms ${ip} ${userAgent}`;

      // 요청 정보 로깅
      if (req.body && Object.keys(req.body).length > 0) {
        this.logger.log(`Request: ${JSON.stringify(req.body)}`);
      }

      // 상태 코드에 따라 로그 레벨 결정
      if (statusCode < 400) {
        this.logger.log(logFormat);
      } else if (statusCode < 500) {
        this.logger.warn(logFormat);
      } else {
        this.logger.error(logFormat);
      }
    });

    next();
  }
}
