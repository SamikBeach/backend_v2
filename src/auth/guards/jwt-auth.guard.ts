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
      // 요청에 유효한 JWT가 있는 경우에만 사용자 정보를 설정
      this.tryAuthenticate(context);
      return true;
    }

    return super.canActivate(context);
  }

  private tryAuthenticate(context: ExecutionContext): void {
    try {
      // JWT 인증을 시도하지만 결과는 무시
      super.canActivate(context);
    } catch (error) {
      // 인증 오류는 무시 (공개 라우트이므로)
    }
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // 공개 라우트는 인증 여부와 상관없이 사용자 정보 반환
      // (user가 없으면 undefined로 처리됨)
      return user;
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
