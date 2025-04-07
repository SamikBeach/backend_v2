import { IsEmail, IsString, Length } from 'class-validator';

/**
 * 회원가입 최종 단계에서 인증 코드 검증을 위한 DTO
 * 인증 성공 시 JWT 토큰이 발급되어 자동 로그인 처리됨
 */
export class CompleteRegistrationDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  code: string;
}
