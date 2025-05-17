import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/is-public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // 공개 라우트의 경우 항상 접근을 허용하되,
      // 요청에 유효한 JWT가 있는 경우 사용자 정보를 설정하기 위해
      // 실제 canActivate 결과를 처리
      const result = super.canActivate(context);

      // Promise 형태로 반환된 경우 처리
      if (result instanceof Promise) {
        return result.then(
          () => true, // 성공 시 true
          () => true, // 실패해도 공개 라우트이므로 true
        );
      }

      // Observable 형태로 반환된 경우 (드물지만 가능)
      if (result instanceof Observable) {
        return new Observable((subscriber) => {
          result.subscribe({
            next: () => {
              subscriber.next(true);
              subscriber.complete();
            },
            error: () => {
              subscriber.next(true);
              subscriber.complete();
            },
          });
        });
      }

      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization;

    if (isPublic) {
      // 공개 라우트이지만 유효한 토큰이 있는 경우
      if (token && user) {
        return user;
      }

      // 토큰이 없거나 유효하지 않은 경우
      return undefined;
    }

    // 보호된 라우트의 경우 인증 확인
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('인증이 필요합니다');
    }

    return user;
  }
}
