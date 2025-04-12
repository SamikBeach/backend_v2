import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/is-public.decorator';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 항상 true를 반환하여 요청이 항상 통과되도록 합니다
    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 에러가 있어도 무시하고 사용자 정보를 그대로 반환합니다
    // 토큰이 없거나 유효하지 않으면 user는 null이 됩니다
    return user;
  }
}
