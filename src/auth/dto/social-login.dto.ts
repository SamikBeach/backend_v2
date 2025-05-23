import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthProvider } from '../../user/entities/user.entity';
import { User } from '../../user/entities/user.entity';
import { Type } from 'class-transformer';

export class SocialLoginDto {
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  authorizationCode?: string;

  @IsString()
  @IsOptional()
  code?: string;

  // Passport 전략에서 유효성 검증 후 설정되는 사용자 정보
  @IsOptional()
  @Type(() => Object)
  user?: any; // User | Record<string, any>
}
