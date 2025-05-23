import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

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
    this.logger.log(`accessToken: ${accessToken ? 'present' : 'not present'}`);
    this.logger.log(`idToken 유형: ${typeof idToken}`);

    try {
      let email = '';
      let providerId = '';
      let fullName = '';

      // 1. 첫 번째 로그인 시 req.body.user에서 사용자 정보 추출
      if (request.body && request.body.user) {
        this.logger.log('첫 번째 로그인: req.body.user에서 사용자 정보 추출');
        const userData = JSON.parse(request.body.user);
        this.logger.log(`사용자 데이터: ${JSON.stringify(userData)}`);

        if (userData.email) {
          email = userData.email;
          this.logger.log(`req.body.user에서 이메일 추출: ${email}`);
        }

        if (userData.name) {
          const firstName = userData.name.firstName || '';
          const lastName = userData.name.lastName || '';
          fullName = `${firstName} ${lastName}`.trim();
          this.logger.log(`req.body.user에서 이름 추출: ${fullName}`);
        }
      }

      // 2. idToken에서 정보 추출 (JWT 디코딩)
      if (idToken) {
        try {
          let decodedToken;

          // idToken이 문자열인 경우 JWT 디코딩
          if (typeof idToken === 'string') {
            this.logger.log('idToken을 JWT로 디코딩 중...');
            decodedToken = jwt.decode(idToken) as any;
          } else if (typeof idToken === 'object') {
            this.logger.log('idToken이 이미 객체 형태로 제공됨');
            decodedToken = idToken;
          }

          if (decodedToken) {
            this.logger.log(`디코딩된 토큰: ${JSON.stringify(decodedToken)}`);

            // providerId는 sub 필드에서 가져옴 (Apple 사용자 고유 ID)
            if (decodedToken.sub) {
              providerId = decodedToken.sub;
              this.logger.log(`idToken에서 providerId 추출: ${providerId}`);
            }

            // 이메일이 없으면 idToken에서 시도
            if (!email && decodedToken.email) {
              email = decodedToken.email;
              this.logger.log(`idToken에서 이메일 추출: ${email}`);
            }

            // 이메일 검증 상태 확인
            if (decodedToken.email_verified !== undefined) {
              this.logger.log(
                `이메일 검증 상태: ${decodedToken.email_verified}`,
              );
            }

            // Apple의 private relay 이메일인지 확인
            if (email && email.includes('@privaterelay.appleid.com')) {
              this.logger.log('Apple Private Relay 이메일 감지됨');
            }
          }
        } catch (tokenError) {
          this.logger.error(`idToken 처리 오류: ${tokenError.message}`);
        }
      }

      // 3. 여전히 이메일이 없으면 에러
      if (!email) {
        this.logger.error('이메일 정보를 찾을 수 없습니다.');
        throw new Error(
          'Apple 로그인에서 이메일 정보를 가져올 수 없습니다. 이메일 공유를 허용해주세요.',
        );
      }

      // 4. providerId가 없으면 이메일 기반으로 생성
      if (!providerId) {
        this.logger.warn(
          'providerId를 찾을 수 없어 이메일 기반 ID를 생성합니다',
        );

        // 이메일 기반 고유 ID 생성
        const emailHash = crypto
          .createHash('sha256')
          .update(email)
          .digest('hex')
          .substring(0, 24);

        providerId = emailHash;
        this.logger.log(`이메일 기반 providerId 생성: ${providerId}`);
      }

      // 5. 이름이 없으면 이메일에서 추출
      if (!fullName) {
        fullName = email.split('@')[0];
        this.logger.log(`이메일에서 사용자명 생성: ${fullName}`);
      }

      this.logger.log(
        `Apple 로그인 최종 정보: 이메일=${email}, 이름=${fullName}, providerId=${providerId}`,
      );

      // 사용자 객체 생성
      const user = {
        email,
        fullName,
        providerId,
        accessToken: accessToken || 'apple_token',
      };

      this.logger.log(`생성된 사용자 객체: ${JSON.stringify(user)}`);

      // 사용자 인증 처리
      const result = await this.authService.validateOAuthUser(user, 'apple');
      this.logger.log(
        `인증 완료된 사용자: ID=${result.id}, 이메일=${result.email}`,
      );

      if (typeof done === 'function') {
        try {
          this.logger.log('done 함수 호출');
          done(null, result);
        } catch (doneError) {
          this.logger.error(`done 함수 호출 오류: ${doneError.message}`);
        }
      } else {
        this.logger.warn('done이 함수가 아니므로 결과만 반환합니다');
      }

      return result;
    } catch (error) {
      this.logger.error(`Apple 로그인 검증 오류: ${error.message}`);
      this.logger.error(error.stack);

      if (typeof done === 'function') {
        try {
          done(error, null);
        } catch (doneError) {
          this.logger.error(`done 함수 호출 오류: ${doneError.message}`);
        }
      }

      throw error;
    }
  }
}
