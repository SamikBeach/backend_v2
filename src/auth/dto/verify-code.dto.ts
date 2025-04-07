import { IsEmail, IsString, Length } from 'class-validator';

/**
 * 이메일 인증 코드 검증을 위한 DTO
 * 인증 성공 시 JWT 토큰이 발급되어 자동 로그인 처리됨
 */
export class VerifyCodeDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  code: string;
}
