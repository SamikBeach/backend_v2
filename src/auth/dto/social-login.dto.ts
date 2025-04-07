import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthProvider } from '../../user/entities/user.entity';

export class SocialLoginDto {
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  authorizationCode?: string;

  // Passport 전략에서 유효성 검증 후 설정되는 사용자 정보
  @IsOptional()
  user?: any;
}
