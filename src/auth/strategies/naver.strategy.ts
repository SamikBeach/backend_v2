import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver';
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
    profile: any,
    done: any,
  ) {
    const { email, nickname } = profile._json.response;
    const profilePhoto = profile._json.response.profile_image;
    const providerId = profile.id;

    const oauthUser = {
      email,
      fullName: nickname,
      profilePhoto,
      providerId,
      accessToken,
    };

    const user = await this.authService.validateOAuthUser(
      oauthUser,
      AuthProvider.NAVER,
    );
    done(null, user);
  }
}
