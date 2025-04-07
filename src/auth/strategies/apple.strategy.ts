import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const keyPath = configService.get<string>('APPLE_PRIVATE_KEY_PATH');
    const privateKeyPath = path.resolve(process.cwd(), keyPath);
    const privateKey = fs.existsSync(privateKeyPath)
      ? fs.readFileSync(privateKeyPath, 'utf8')
      : '';

    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyString: privateKey,
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
      passReqToCallback: true,
      scope: ['email', 'name'],
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: any,
  ): Promise<any> {
    // Apple ID 토큰에서 정보 추출
    const decodedToken = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8'),
    );

    const email = decodedToken.email;
    // Apple은 첫 인증 이후 이름 정보를 제공하지 않기 때문에 사용자 정보는 요청에서 추출
    const firstName = request.body?.firstName || '';
    const lastName = request.body?.lastName || '';
    const fullName =
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : email.split('@')[0];

    const user = {
      email,
      fullName,
      providerId: decodedToken.sub,
      accessToken,
    };

    const result = await this.authService.validateOAuthUser(user, 'apple');
    done(null, result);
  }
}
