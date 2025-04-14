import { ExecutionContext, Injectable } from '@nestjs/common';
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
      // 공개 라우트의 경우 인증 시도를 하되, 인증 실패해도 요청을 차단하지 않음
      const result = super.canActivate(context);

      if (result instanceof Promise) {
        return result.then(
          () => true, // 인증 성공, 사용자 정보와 함께 진행
          () => true, // 인증 실패, 사용자 정보 없이 진행
        );
      }

      if (result instanceof Observable) {
        // Observable 처리는 여기서 생략 (필요시 구현)
      }

      return true; // 인증 결과와 상관없이 진행
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // 공개 라우트의 경우 인증 실패해도 예외를 던지지 않음
      // 그냥 사용자 정보(이는 undefined일 수 있음)를 반환
      return user;
    }

    // 보호된 라우트의 경우 기본 동작 유지
    if (err || !user) {
      throw err || new Error('인증되지 않음');
    }
    return user;
  }
}
