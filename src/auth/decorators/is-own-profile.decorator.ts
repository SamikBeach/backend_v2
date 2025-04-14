import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 현재 로그인한 사용자가 요청한 사용자 정보의 소유자인지 확인하는 데코레이터
 * params.id 파라미터와 현재 로그인한 사용자의 ID를 비교합니다.
 */
export const IsOwnProfile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    try {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user;
      const params = request.params;

      console.log('[IsOwnProfile] Request params:', JSON.stringify(params));
      console.log(
        '[IsOwnProfile] User:',
        user ? `ID: ${user.id}, Email: ${user.email}` : 'Not authenticated',
      );

      // 인증되지 않은 사용자 또는 ID 파라미터가 없는 경우
      if (!user) {
        console.log('[IsOwnProfile] No authenticated user found');
        return false;
      }

      if (!params.id) {
        console.log('[IsOwnProfile] No ID parameter found in request');
        return false;
      }

      // ID를 숫자로 변환하여 비교
      const paramsId = parseInt(params.id, 10);
      if (isNaN(paramsId)) {
        console.log(`[IsOwnProfile] Invalid ID parameter: ${params.id}`);
        return false;
      }

      const result = paramsId === user.id;
      console.log(
        `[IsOwnProfile] Comparing: ${paramsId} === ${user.id} => ${result}`,
      );

      return result;
    } catch (error) {
      console.error('[IsOwnProfile] Error:', error);
      return false;
    }
  },
);
