import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile as NaverProfile } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/entities/user.entity';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('NAVER_CLIENT_ID'),
      clientSecret: configService.get<string>('NAVER_CLIENT_SECRET'),
      callbackURL: configService.get<string>('NAVER_CALLBACK_URL'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: NaverProfile,
    done: any,
  ) {
    const { email, nickname, profileImage, id, name } = profile;

    const fullName = name || nickname || '';

    const oauthUser = {
      email: email || '',
      fullName,
      profilePhoto: profileImage || '',
      providerId: id,
      accessToken,
    };

    const user = await this.authService.validateOAuthUser(
      oauthUser,
      AuthProvider.NAVER,
    );
    done(null, user);
  }
}
