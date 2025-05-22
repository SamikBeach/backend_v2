import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
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
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    const { email } = profile._json.kakao_account;
    const displayName = profile._json.properties.nickname;
    const profilePhoto = profile._json.properties.profile_image;
    const providerId = profile.id.toString();

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
  }
}
