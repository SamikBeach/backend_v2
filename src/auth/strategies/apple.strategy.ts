import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // 필요한 환경 변수를 가져옵니다
    const keyPath = configService.get<string>('APPLE_PRIVATE_KEY_PATH');
    const privateKeyPath = path.resolve(process.cwd(), keyPath);
    const fileExists = fs.existsSync(privateKeyPath);
    const privateKey = fileExists
      ? fs.readFileSync(privateKeyPath, 'utf8')
      : '';
    const clientID = configService.get<string>('APPLE_CLIENT_ID');
    const teamID = configService.get<string>('APPLE_TEAM_ID');
    const keyID = configService.get<string>('APPLE_KEY_ID');
    const callbackURL = configService.get<string>('APPLE_CALLBACK_URL');

    // super 호출 전에 로깅하지 않고 옵션만 설정
    super({
      clientID,
      teamID,
      keyID,
      privateKeyString: privateKey,
      callbackURL,
      passReqToCallback: true,
      scope: ['email', 'name'],
    });

    // super 호출 후 로그 출력
    this.logger.log(`Apple 인증 키 경로: ${privateKeyPath}`);
    this.logger.log(`Apple 키 파일 존재 여부: ${fileExists}`);

    if (!privateKey) {
      this.logger.error('Apple 인증 키를 로드할 수 없습니다.');
    } else {
      this.logger.log('Apple 인증 키가 성공적으로 로드되었습니다.');
    }

    this.logger.log(`Apple 설정 정보: 
      clientID: ${clientID},
      teamID: ${teamID},
      keyID: ${keyID},
      callbackURL: ${callbackURL}
    `);
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: any,
  ): Promise<any> {
    this.logger.log('Apple 로그인 검증 시작');
    this.logger.log(`요청 본문: ${JSON.stringify(request.body)}`);

    try {
      // idToken이 없는 경우 체크
      if (!idToken) {
        this.logger.error('idToken이 제공되지 않았습니다');
        this.logger.log(`accessToken: ${accessToken}`);
        done(new Error('idToken이 제공되지 않았습니다'), null);
        return;
      }

      this.logger.log(`idToken: ${idToken}`);

      // Apple ID 토큰에서 정보 추출
      const decodedToken = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8'),
      );

      this.logger.log(`디코딩된 토큰: ${JSON.stringify(decodedToken)}`);

      // 이메일이 없는 경우 체크
      if (!decodedToken.email) {
        this.logger.error('이메일이 토큰에 포함되어 있지 않습니다');
        if (request.body && request.body.email) {
          this.logger.log('요청 본문에서 이메일을 사용합니다');
          decodedToken.email = request.body.email;
        } else {
          done(new Error('이메일을 찾을 수 없습니다'), null);
          return;
        }
      }

      const email = decodedToken.email;
      // Apple은 첫 인증 이후 이름 정보를 제공하지 않기 때문에 사용자 정보는 요청에서 추출
      const firstName = request.body?.firstName || '';
      const lastName = request.body?.lastName || '';
      const fullName =
        firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : email.split('@')[0];

      this.logger.log(`Apple 로그인: ${email}, ${fullName}`);

      const user = {
        email,
        fullName,
        providerId: decodedToken.sub,
        accessToken,
      };

      this.logger.log(`생성된 사용자 객체: ${JSON.stringify(user)}`);

      const result = await this.authService.validateOAuthUser(user, 'apple');
      this.logger.log('사용자 인증 완료');
      done(null, result);
    } catch (error) {
      this.logger.error(`Apple 로그인 검증 오류: ${error.message}`);
      this.logger.error(error.stack);
      done(error, null);
    }
  }
}
