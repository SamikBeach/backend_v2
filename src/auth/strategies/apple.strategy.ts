import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const appleClientId = configService.get<string>('APPLE_CLIENT_ID');
    const appleTeamId = configService.get<string>('APPLE_TEAM_ID');
    const appleKeyId = configService.get<string>('APPLE_KEY_ID');
    const appleCallbackUrl = configService.get<string>('APPLE_CALLBACK_URL');

    // Private key 로딩
    const privateKeyString = AppleStrategy.loadPrivateKey(configService);

    super({
      clientID: appleClientId,
      teamID: appleTeamId,
      keyID: appleKeyId,
      privateKeyString: privateKeyString,
      callbackURL: appleCallbackUrl,
      scope: ['name', 'email'],
      passReqToCallback: false,
    });

    this.logger.log('Apple Strategy initialized successfully', {
      clientID: appleClientId,
      teamID: appleTeamId,
      keyID: appleKeyId,
      callbackURL: appleCallbackUrl,
      privateKeyLoaded: !!privateKeyString,
    });
  }

  private static loadPrivateKey(configService: ConfigService): string {
    // Private key를 환경 변수에서 직접 가져오거나 파일에서 읽기
    let privateKeyString = configService.get<string>('APPLE_PRIVATE_KEY');

    if (!privateKeyString) {
      const privateKeyPath = configService.get<string>(
        'APPLE_PRIVATE_KEY_PATH',
      );
      try {
        const fullPath = path.resolve(process.cwd(), privateKeyPath);
        privateKeyString = fs.readFileSync(fullPath, 'utf8');
        console.log(`Apple private key loaded from file: ${fullPath}`);
      } catch (error) {
        console.error(
          `Failed to read Apple private key from file: ${privateKeyPath}`,
          error,
        );
        throw new Error(
          `Apple private key file not found or unreadable: ${privateKeyPath}`,
        );
      }
    } else {
      // 환경 변수에서 가져온 경우 \n을 실제 개행으로 변환
      privateKeyString = privateKeyString.replace(/\\n/g, '\n');
      console.log('Apple private key loaded from environment variable');
    }

    if (!privateKeyString || !privateKeyString.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Invalid Apple private key format');
    }

    return privateKeyString;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile, // 이 프로필은 Apple의 디코딩된 id_token을 포함해야 함
    done: VerifyCallback,
  ): Promise<any> {
    this.logger.debug(`AppleStrategy profile: ${JSON.stringify(profile)}`);

    const appleUserId = profile.id; // Apple id_token의 'sub' 클레임
    const email = profile.email;
    // Apple은 첫 번째 인증에서만 이름을 제공함
    // passport-apple이 사용 가능한 경우 profile.name으로 파싱할 수 있음
    const firstName = profile.name?.firstName;
    const lastName = profile.name?.lastName;
    let fullName: string | undefined = undefined;

    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    } else if (firstName) {
      fullName = firstName;
    }

    if (!appleUserId || !email) {
      this.logger.error(
        'Apple 프로필에 예상되는 id (sub) 또는 이메일이 포함되지 않음.',
        profile,
      );
      return done(
        new UnauthorizedException(
          'Apple에서 필요한 사용자 정보를 가져오는데 실패했습니다.',
        ),
        null,
      );
    }

    try {
      // passport-apple의 `profile`이 우리가 필요한 것을 직접 제공할 수 있음
      // 이것이 `validateOAuthUser`에서 예상하는 구조와 일치하는지 확인해야 함
      // 우리의 `validateOAuthUser`는 `providerId`, `email`, `fullName?`을 가진 객체를 예상함
      const oauthUser = {
        providerId: appleUserId,
        email: email,
        fullName: fullName,
        // accessToken은 필요한 경우 Apple의 원본 id_token이지만,
        // passport-apple이 이미 검증했음
        // OAuthUser 인터페이스와의 일관성을 위해 여기에 무언가를 전달하거나 조정할 수 있음
        // 지금은 전략에서 받은 accessToken을 전달함
        accessToken: accessToken, // 또는 validateOAuthUser에서 필요한 경우 접근 가능한 id_token
      };

      // authService.validateOAuthUser를 사용하여 사용자를 찾거나 생성함
      // 이 메서드는 이미 다양한 OAuth 제공자를 처리하도록 설계됨
      const user = await this.authService.validateOAuthUser(
        oauthUser,
        AuthProvider.APPLE,
      );

      if (!user) {
        return done(
          new UnauthorizedException(
            'Apple Sign In을 위한 사용자를 검증하거나 생성할 수 없습니다.',
          ),
          null,
        );
      }
      return done(null, user);
    } catch (error) {
      this.logger.error('Apple OAuth 사용자 검증 중 오류 발생', error);
      return done(error, null);
    }
  }
}
