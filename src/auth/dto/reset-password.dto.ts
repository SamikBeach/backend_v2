import { IsEmail, IsString, MinLength, Length } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;
}

export class VerifyResetTokenDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  token: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  token: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  newPassword: string;
}
