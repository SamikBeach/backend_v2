import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    this.logger.log(`accessToken 유형: ${typeof accessToken}`);
    this.logger.log(`idToken 유형: ${typeof idToken}`);

    try {
      // 요청 본문에서 code 확인
      const code = request.body?.code;
      this.logger.log(`Apple 인증 코드: ${code}`);

      // 요청 본문에서 사용자 정보 확인
      let email = '';
      let providerId = '';

      // 1. idToken에서 정보 추출 시도
      if (idToken) {
        try {
          let tokenPayload;

          // idToken이 객체인 경우 (최신 버전의 passport-apple에서 가능)
          if (typeof idToken === 'object') {
            this.logger.log('idToken이 객체 형태로 제공됨');
            tokenPayload = idToken;
          }
          // idToken이 문자열인 경우 (기존 방식)
          else if (typeof idToken === 'string' && idToken.includes('.')) {
            this.logger.log('idToken이 JWT 문자열로 제공됨');
            const parts = idToken.split('.');
            if (parts.length >= 2) {
              try {
                tokenPayload = JSON.parse(
                  Buffer.from(parts[1], 'base64').toString('utf-8'),
                );
              } catch (e) {
                this.logger.error(`JWT 디코딩 오류: ${e.message}`);
              }
            }
          }

          if (tokenPayload) {
            // 토큰이 너무 길면 로그 출력을 위해 일부만 출력
            const tokenPayloadString = JSON.stringify(tokenPayload);
            const logPayload =
              tokenPayloadString.length > 500
                ? tokenPayloadString.substring(0, 500) + '...'
                : tokenPayloadString;

            this.logger.log(`토큰 페이로드: ${logPayload}`);

            // 가장 중요한 정보: SUB(사용자 고유 ID)와 EMAIL
            if (tokenPayload.sub) {
              providerId = tokenPayload.sub;
              this.logger.log(
                `ID 토큰의 sub 값을 providerId로 사용: ${providerId}`,
              );
            }

            if (tokenPayload.email) {
              email = tokenPayload.email;
              this.logger.log(`ID 토큰의 email 값 사용: ${email}`);
            }
          }
        } catch (tokenError) {
          this.logger.error(`토큰 처리 오류: ${tokenError.message}`);
        }
      }

      // 2. 이메일이 없으면 요청 본문에서 시도
      if (!email && request.body && request.body.email) {
        this.logger.log('요청 본문에서 이메일을 사용합니다');
        email = request.body.email;
      }

      // 3. 여전히 이메일이 없으면 profile에서 시도
      if (!email && profile) {
        this.logger.log('프로필에서 이메일을 사용합니다');
        this.logger.log(`프로필 정보: ${JSON.stringify(profile)}`);
        if (typeof profile === 'object' && profile.email) {
          email = profile.email;
        }
      }

      // 이메일이 없으면 기본 이메일 생성 (임시방편)
      if (!email) {
        this.logger.warn('이메일을 찾을 수 없어 임시 이메일을 생성합니다');
        // 임의의 고유 ID 생성
        const tempId = crypto.randomBytes(8).toString('hex');
        email = `user_${tempId}@example.com`;
        this.logger.log(`생성된 임시 이메일: ${email}`);
      } else {
        // Apple의 privaterelay.appleid.com 이메일은 유니크한 식별자이므로 그대로 사용
        this.logger.log(`Apple에서 제공한 실제 이메일 사용: ${email}`);
      }

      // providerId가 없으면 요청 본문이나 다른 데이터에서 시도
      if (!providerId) {
        this.logger.warn(
          'providerId를 찾을 수 없어 이메일 기반 ID를 생성합니다',
        );

        // 이메일 기반 고유 ID 생성 - 항상 동일한 이메일에 대해 동일한 ID 반환
        if (email && !email.includes('@example.com')) {
          // 이메일이 privaterelay.appleid.com으로 끝나는 경우 특별 처리
          if (email.includes('@privaterelay.appleid.com')) {
            // privaterelay 이메일은 Apple에서 고유하게 생성된 이메일이므로
            // 이메일 자체를 hash로 변환하여 providerId로 사용
            const emailHash = crypto
              .createHash('sha256')
              .update(email)
              .digest('hex')
              .substring(0, 24);

            providerId = `apple_${emailHash}`;
            this.logger.log(
              `Apple privaterelay 이메일 기반 providerId 생성: ${providerId}`,
            );
          } else {
            // 일반 이메일인 경우 해당 이메일로 일관된 providerId 생성
            const emailHash = crypto
              .createHash('sha256')
              .update(email)
              .digest('hex')
              .substring(0, 24);
            providerId = emailHash;
            this.logger.log(`이메일 기반 providerId 생성: ${providerId}`);
          }
        } else {
          // 임시 이메일인 경우 timestamp 기반 ID 생성
          providerId = `id_${Date.now()}`;
          this.logger.log(`시간 기반 providerId 생성: ${providerId}`);
        }

        this.logger.log(`생성된 providerId: ${providerId}`);
      }

      // 이름 정보 처리
      const firstName = request.body?.firstName || '';
      const lastName = request.body?.lastName || '';
      const fullName =
        firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : email.split('@')[0];

      this.logger.log(
        `Apple 로그인: 이메일=${email}, 이름=${fullName}, providerId=${providerId}`,
      );

      // 사용자 객체 생성
      const user = {
        email,
        fullName,
        providerId,
        accessToken: accessToken || code, // accessToken이 없으면 code를 사용
      };

      this.logger.log(`생성된 사용자 객체: ${JSON.stringify(user)}`);

      // 사용자 인증 처리
      const result = await this.authService.validateOAuthUser(user, 'apple');
      this.logger.log(`인증 완료된 사용자: ${JSON.stringify(result)}`);

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
