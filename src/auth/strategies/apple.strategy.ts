import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const keyPath = configService.get<string>('APPLE_PRIVATE_KEY_PATH');
    const privateKeyPath = path.resolve(process.cwd(), keyPath);
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyString: privateKey,
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
      passReqToCallback: true,
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
    try {
      let email = '';
      let providerId = ''; // Apple의 sub 값 (가장 중요한 고유 식별자)
      let fullName = '';

      // 1. idToken에서 sub 값 우선 추출 (가장 중요)
      if (idToken && typeof idToken === 'string') {
        try {
          this.logger.log('🔍 idToken을 JWT로 디코딩 중...');
          const decodedToken = jwt.decode(idToken, { json: true }) as any;
          this.logger.log(
            `📋 JWT 디코딩 결과: ${JSON.stringify(decodedToken, null, 2)}`,
          );

          if (decodedToken) {
            // sub 값 추출 (Apple의 고유 사용자 식별자)
            if (decodedToken.sub) {
              providerId = decodedToken.sub;
              this.logger.log(`✅ idToken에서 Apple sub 추출: ${providerId}`);
            } else {
              this.logger.warn('⚠️ idToken에 sub 값이 없습니다.');
            }

            // 이메일도 idToken에서 추출
            if (decodedToken.email) {
              email = decodedToken.email;
              this.logger.log(`📧 idToken에서 이메일 추출: ${email}`);
            } else {
              this.logger.warn('⚠️ idToken에 이메일 값이 없습니다.');
            }

            // 이메일 검증 상태 확인
            if (decodedToken.email_verified !== undefined) {
              this.logger.log(
                `✉️ 이메일 검증 상태: ${decodedToken.email_verified}`,
              );
            }

            // Apple의 private relay 이메일인지 확인
            if (email && email.includes('@privaterelay.appleid.com')) {
              this.logger.log(
                '🔒 Apple Private Relay 이메일 감지됨 (Apple 제공)',
              );
            }

            // aud, iss 등 추가 정보 로깅
            if (decodedToken.aud) {
              this.logger.log(`🎯 JWT audience: ${decodedToken.aud}`);
            }
            if (decodedToken.iss) {
              this.logger.log(`🏢 JWT issuer: ${decodedToken.iss}`);
            }
          } else {
            this.logger.error('❌ JWT 디코딩 결과가 null입니다.');
          }
        } catch (tokenError) {
          this.logger.error(
            `❌ idToken JWT 디코딩 오류: ${tokenError.message}`,
          );
          this.logger.error(`idToken 내용: ${idToken.substring(0, 100)}...`);
        }
      } else {
        this.logger.warn(
          `⚠️ idToken이 없거나 문자열이 아닙니다. 타입: ${typeof idToken}`,
        );
      }

      // 2. profile에서 정보 추출 (sub가 없는 경우 보조적으로 사용)
      if (profile) {
        this.logger.log(`👤 profile 정보: ${JSON.stringify(profile, null, 2)}`);

        // providerId가 없으면 profile.id에서 가져옴
        if (!providerId && profile.id) {
          providerId = profile.id;
          this.logger.log(`🆔 profile에서 providerId 추출: ${providerId}`);
        } else if (!providerId) {
          this.logger.warn('⚠️ profile에 id 값이 없습니다.');
        }

        // 이메일 추출 (기존 이메일이 없는 경우)
        if (!email && profile.email) {
          email = profile.email;
          this.logger.log(`📧 profile에서 이메일 추출: ${email}`);
        }

        // 이름 추출
        if (profile.name) {
          const firstName = profile.name.firstName || '';
          const lastName = profile.name.lastName || '';
          fullName = `${firstName} ${lastName}`.trim();
          this.logger.log(`👨‍💼 profile에서 이름 추출: ${fullName}`);
        } else {
          this.logger.warn('⚠️ profile에 name 정보가 없습니다.');
        }

        // profile의 추가 정보 로깅
        if (profile.displayName) {
          this.logger.log(`🏷️ profile displayName: ${profile.displayName}`);
        }
      } else {
        this.logger.warn('⚠️ profile 객체가 없습니다.');
      }

      // 3. 첫 번째 로그인 시 req.body.user에서 사용자 정보 추출
      if (request.body && request.body.user) {
        const userData =
          typeof request.body.user === 'string'
            ? JSON.parse(request.body.user)
            : request.body.user;

        if (userData.name) {
          const firstName = userData.name.firstName || '';
          const lastName = userData.name.lastName || '';
          fullName = `${firstName} ${lastName}`.trim();
        }
      }

      // 4. Apple sub (providerId) 필수 검증
      if (!providerId) {
        this.logger.error('❌ Apple sub 값을 찾을 수 없습니다.');
        this.logger.error(
          'idToken, profile, req.body 모두에서 sub/id를 찾지 못했습니다.',
        );

        // 최후의 수단: authorization code에서 고정된 식별자 생성
        const code = request.body?.code;
        if (code) {
          // code를 기반으로 고정된 해시 생성 (같은 사용자는 같은 code를 받을 가능성이 높음)
          const codeHash = crypto
            .createHash('sha256')
            .update(code + 'apple_fallback')
            .digest('hex')
            .substring(0, 24);
          providerId = `apple_fallback_${codeHash}`;
          this.logger.warn(
            `⚠️ code 기반 fallback providerId 생성: ${providerId}`,
          );
        } else {
          throw new Error(
            'Apple 로그인에서 사용자 고유 식별자(sub)를 받지 못했습니다. 다시 시도해주세요.',
          );
        }
      }

      // 5. 이메일 처리 (Apple은 이메일을 제공하지 않을 수 있음)
      if (!email) {
        this.logger.warn(
          '이메일 정보를 찾을 수 없음 - providerId 기반 임시 이메일 생성',
        );
        // providerId를 기반으로 임시 이메일 생성 (우리 도메인 사용)
        email = `apple_user_${providerId}@temp.booklog.app`;
        this.logger.log(`providerId 기반 임시 이메일 생성: ${email}`);
      }

      // 6. 이름이 없으면 이메일에서 추출
      if (!fullName) {
        fullName = email.split('@')[0];
        this.logger.log(`이메일에서 사용자명 생성: ${fullName}`);
      }

      this.logger.log(
        `🍎 Apple 로그인 최종 정보: 이메일=${email}, 이름=${fullName}, providerId=${providerId}`,
      );

      // providerId 유효성 검증 강화
      if (!providerId || providerId.length < 6) {
        this.logger.error(`❌ Apple providerId가 유효하지 않음: ${providerId}`);
        throw new Error(
          'Apple 로그인에서 유효한 사용자 식별자를 받지 못했습니다.',
        );
      }

      // 사용자 객체 생성
      const user = {
        email: email, // Apple에서 제공하지 않으면 null
        fullName: fullName || `Apple User`,
        providerId,
        accessToken: accessToken || 'apple_token',
      };

      this.logger.log(`생성된 사용자 객체: ${JSON.stringify(user, null, 2)}`);
      this.logger.log(`🔑 Apple 사용자 고유 식별자(sub): ${providerId}`);

      // 사용자 인증 처리
      const result = await this.authService.validateOAuthUser(user, 'apple');
      this.logger.log(
        `✅ 인증 완료된 사용자: ID=${result.id}, 이메일=${result.email}, providerId=${result.providerId}`,
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

      done(null, result);
      return result;
    } catch (error) {
      this.logger.error(`❌ Apple 로그인 검증 오류: ${error.message}`);
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
