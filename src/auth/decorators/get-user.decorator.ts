import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';

/**
 * 현재 인증된 사용자 정보를 가져오는 커스텀 파라미터 데코레이터
 * JWT 가드를 통해 인증된 요청에서 사용자 정보를 추출합니다.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@GetUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
