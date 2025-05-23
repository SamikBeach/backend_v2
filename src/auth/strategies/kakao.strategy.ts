import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/entities/user.entity';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ) {
    try {
      // 카카오 프로필 데이터 추출
      const kakaoAccount = profile._json?.kakao_account;
      const properties = profile._json?.properties;

      // 이메일이 제공되지 않을 수 있음 (사용자가 동의하지 않은 경우)
      const email = kakaoAccount?.email || null;
      const displayName = properties?.nickname || '';
      const profilePhoto =
        properties?.profile_image || properties?.thumbnail_image || '';
      const providerId = profile.id?.toString() || '';

      if (!providerId) {
        throw new Error('카카오 사용자 ID를 가져올 수 없습니다.');
      }

      const oauthUser = {
        email,
        fullName: displayName,
        profilePhoto,
        providerId,
        accessToken,
      };

      const user = await this.authService.validateOAuthUser(
        oauthUser,
        AuthProvider.KAKAO,
      );
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
