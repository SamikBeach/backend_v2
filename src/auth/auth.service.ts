import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User, AuthProvider } from '../user/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { RegisterDto } from './dto/register.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import verifyAppleToken from 'verify-apple-id-token';
import * as fs from 'fs';
import * as path from 'path';

// OAuth 사용자 정보 인터페이스
interface OAuthUser {
  email?: string; // 카카오는 이메일을 제공하지 않을 수 있음
  fullName?: string;
  profilePhoto?: string;
  providerId: string;
  accessToken: string; // For Apple, this will likely be an identityToken
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호가 없는 경우 로그인 불가
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호 확인
    if (await bcrypt.compare(password, user.password)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // 액세스 토큰과 리프레시 토큰 생성
    const tokens = await this.generateTokens(user);

    // 리프레시 토큰 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async socialLogin(socialLoginDto: SocialLoginDto) {
    try {
      const { provider, accessToken } = socialLoginDto;
      // code 속성 별도로 추출
      const code = socialLoginDto.code;

      // 이미 Passport 전략에서 사용자 검증이 완료된 경우
      if (socialLoginDto.user) {
        return this.generateAuthResponseWithRefresh(socialLoginDto.user);
      }

      // accessToken만 있는 경우 (모바일 앱 등에서 직접 전달)
      if (!socialLoginDto.user && accessToken) {
        // provider별 처리
        switch (provider) {
          case AuthProvider.GOOGLE:
            // 모바일에서 직접 Google OAuth 처리 후 서버에 토큰 전달 시
            throw new BadRequestException(
              '소셜 로그인은 웹 경로를 통해 인증해야 합니다.',
            );
          case AuthProvider.APPLE:
            try {
              const appleUser =
                await this.verifyAppleTokenAndExtractUser(accessToken);
              const user = await this.validateOAuthUser(appleUser, provider);
              return this.generateAuthResponseWithRefresh(user);
            } catch (error) {
              this.logger.error(
                `Apple login error: ${error.message}`,
                error.stack,
              );
              if (
                error instanceof UnauthorizedException ||
                error instanceof BadRequestException ||
                error instanceof ConflictException
              ) {
                throw error;
              }
              throw new BadRequestException(
                'Apple 로그인 중 오류가 발생했습니다.',
              );
            }
          default:
            throw new BadRequestException('지원하지 않는 인증 제공자입니다.');
        }
      }

      // Apple authorization code 처리
      if (!socialLoginDto.user && code && provider === AuthProvider.APPLE) {
        try {
          const idToken = await this.exchangeAppleCodeForToken(code);
          const appleUser = await this.verifyAppleTokenAndExtractUser(idToken);
          const user = await this.validateOAuthUser(appleUser, provider);
          return this.generateAuthResponseWithRefresh(user);
        } catch (error) {
          this.logger.error(
            `Apple code exchange error: ${error.message}`,
            error.stack,
          );
          if (
            error instanceof UnauthorizedException ||
            error instanceof BadRequestException ||
            error instanceof ConflictException
          ) {
            throw error;
          }
          throw new BadRequestException(
            'Apple 인증 코드 처리 중 오류가 발생했습니다.',
          );
        }
      }

      throw new BadRequestException('유효한 소셜 로그인 정보가 필요합니다.');
    } catch (error) {
      console.error('Social login error:', error);
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        '소셜 로그인 중 오류가 발생했습니다: ' + error.message,
      );
    }
  }

  async signup(createUserDto: CreateUserDto) {
    const user = await this.userService.createLocalUser(createUserDto);

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.verificationToken,
    );

    return {
      message: 'Verification email sent',
      email: user.email,
    };
  }

  async verifyEmail(email: string, code: string) {
    try {
      // 인증 코드 확인 및 사용자 활성화
      const user = await this.userService.verifyEmailAndActivateUser(
        email,
        code,
      );

      // 액세스 토큰과 리프레시 토큰 생성
      const tokens = await this.generateTokens(user);

      // 리프레시 토큰 저장
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        message: '이메일 인증이 완료되었습니다.',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('이메일 인증 중 오류가 발생했습니다.');
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const resetToken = await this.userService.createPasswordResetToken(email);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    // 소셜 로그인 계정인지 확인
    const isSocialAccount = user.provider === AuthProvider.GOOGLE;

    return {
      message: '비밀번호 재설정 안내가 이메일로 발송되었습니다.',
      email,
      isSocialAccount,
      note: isSocialAccount
        ? '소셜 로그인 계정에 비밀번호를 설정하면 이메일 로그인도 가능해집니다.'
        : undefined,
    };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 소셜 로그인 계정인 경우 로컬 인증 방식 추가
    if (user.provider === AuthProvider.GOOGLE) {
      // 비밀번호 재설정과 함께 로컬 인증 방식 추가
      await this.userService.resetPasswordAndAddLocalProvider(
        email,
        token,
        newPassword,
      );

      return {
        message:
          '비밀번호가 성공적으로 설정되었습니다. 이제 이메일 로그인을 사용할 수 있습니다.',
        canUseEmailLogin: true,
      };
    } else {
      // 일반 계정의 비밀번호 재설정
      await this.userService.resetPassword(email, token, newPassword);

      return {
        message: '비밀번호가 성공적으로 재설정되었습니다.',
      };
    }
  }

  async verifyResetToken(email: string, token: string) {
    try {
      const user = await this.userService.findByEmail(email);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.resetPasswordToken) {
        throw new UnauthorizedException('No reset token found');
      }

      if (user.resetPasswordToken !== token) {
        throw new UnauthorizedException('Invalid reset token');
      }

      if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
        throw new UnauthorizedException('Reset token has expired');
      }

      // 소셜 로그인 계정인지 확인
      const isSocialAccount = user.provider === AuthProvider.GOOGLE;

      return {
        isValid: true,
        message: 'Token is valid',
        isSocialAccount, // 소셜 계정 여부를 응답에 포함
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to verify reset token');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    // sub 필드가 숫자가 아닌 경우 처리
    if (typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Invalid token payload');
    }

    let user: User | null = null;

    // 소셜 로그인 사용자의 경우 providerId로 조회 (더 정확함)
    if (
      payload.provider &&
      payload.provider !== AuthProvider.LOCAL &&
      payload.providerId
    ) {
      user = await this.userService.findByProviderId(
        payload.providerId,
        payload.provider,
      );

      if (!user) {
        this.logger.warn(
          `JWT 검증: providerId로 사용자를 찾을 수 없음 - providerId: ${payload.providerId}, provider: ${payload.provider}`,
        );
        // providerId로 찾지 못한 경우 fallback으로 사용자 ID로 조회
        user = await this.userService.findOne(payload.sub);
      }
    } else {
      // 로컬 사용자 또는 provider 정보가 없는 경우 사용자 ID로 조회
      user = await this.userService.findOne(payload.sub);
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // OAuth 사용자 검증 및 처리 함수
  async validateOAuthUser(
    oauthUser: OAuthUser,
    provider: string,
  ): Promise<User> {
    try {
      const { email, fullName, providerId } = oauthUser;
      this.logger.log(
        `🔍 OAuth 사용자 검증 시작: provider=${provider}, email=${email}, providerId=${providerId}`,
      );

      const authProvider = this.getAuthProviderFromString(provider);
      if (!authProvider) {
        this.logger.error(
          `❌ OAuth 인증 실패: 지원하지 않는 제공자 - ${provider}`,
        );
        throw new BadRequestException('지원하지 않는 인증 제공자입니다.');
      }

      if (!providerId) {
        this.logger.error('❌ OAuth 인증 실패: providerId 없음');
        throw new UnauthorizedException(
          '소셜 로그인에 필요한 고유 식별자를 획득하지 못했습니다.',
        );
      }

      this.logger.log(
        `🔑 ${provider.toUpperCase()} providerId로 기존 사용자 검색: ${providerId}`,
      );

      // 1. 먼저 해당 providerId로 가입된 사용자가 있는지 확인 (최우선)
      let user = await this.userService.findByProviderId(
        providerId,
        authProvider,
      );

      if (user) {
        this.logger.log(
          `✅ 기존 사용자 발견: userId=${user.id}, 기존 이메일=${user.email}, 새 이메일=${email}, provider=${user.provider}, providerId=${user.providerId}`,
        );

        // 🚨 중요: 반환되는 사용자의 provider가 요청한 provider와 일치하는지 확인
        if (user.provider !== authProvider) {
          this.logger.error(
            `🚨 심각한 오류: 요청한 provider(${authProvider})와 DB의 provider(${user.provider})가 다릅니다!`,
          );
          throw new BadRequestException(
            '인증 제공자 정보가 일치하지 않습니다. 관리자에게 문의하세요.',
          );
        }

        this.logger.log(
          `🎉 기존 사용자 로그인 성공: userId=${user.id}, provider=${user.provider}, providerId=${user.providerId}`,
        );
        return user;
      }

      // 2. 기존 사용자가 없는 경우 새로 생성
      this.logger.log(
        `👤 새 사용자 생성 필요: provider=${provider}, providerId=${providerId}`,
      );

      // 이메일이 없는 경우 처리 (카카오 등)
      let finalEmail = email || null;

      // 이메일이 있는 경우에만 중복 체크
      if (finalEmail) {
        const existingUser = await this.userService.findByEmail(finalEmail);
        if (existingUser) {
          this.logger.warn(
            `⚠️ 이메일로 찾은 기존 사용자 발견: userId=${existingUser.id}, provider=${existingUser.provider}`,
          );
          // 같은 이메일로 다른 방식(로컬 또는 다른 소셜)으로 가입한 경우
          throw new ConflictException(
            '이미 다른 방식으로 가입된 이메일입니다. 다른 로그인 방식을 이용해주세요.',
          );
        }
      }

      this.logger.log(
        `🆕 새 사용자 생성 중: email=${finalEmail || '없음'}, providerId=${providerId}`,
      );

      // 새 사용자 생성
      const newUserData = {
        email: finalEmail,
        username: this.generateUsername(fullName, finalEmail, authProvider),
        provider: authProvider,
        providerId: providerId,
        marketingConsent: false,
      };

      this.logger.log(
        `📝 사용자 생성 데이터: ${JSON.stringify(newUserData, null, 2)}`,
      );

      user = await this.userService.createSocialUser(newUserData);

      this.logger.log(
        `🎉 새 사용자 생성 완료: userId=${user.id}, email=${user.email}, providerId=${user.providerId}`,
      );

      return user;
    } catch (error) {
      this.logger.error(`❌ OAuth 사용자 검증 오류: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  // 문자열로부터 AuthProvider enum 값 반환
  private getAuthProviderFromString(provider: string): AuthProvider | null {
    switch (provider.toLowerCase()) {
      case 'google':
        return AuthProvider.GOOGLE;
      case 'naver':
        return AuthProvider.NAVER;
      case 'kakao':
        return AuthProvider.KAKAO;
      case 'apple':
        return AuthProvider.APPLE;
      default:
        return null;
    }
  }

  // 인증 응답 생성 (JWT 토큰 + 사용자 정보)
  private async generateAuthResponseWithRefresh(user: User) {
    // 액세스 토큰과 리프레시 토큰 생성
    const tokens = await this.generateTokens(user);

    // 리프레시 토큰 저장
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  // 리프레시 토큰을 사용하여 액세스 토큰 갱신
  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;

      // 리프레시 토큰 검증
      const payload = await this.verifyRefreshToken(refreshToken);

      // 사용자 찾기
      const user = await this.userService.findOne(payload.sub);

      // 저장된 리프레시 토큰과 비교
      if (!user.refreshToken) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      // 새 토큰 생성
      const tokens = await this.generateTokens(user);

      // 새 리프레시 토큰 저장
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch {
      throw new UnauthorizedException('Failed to refresh tokens');
    }
  }

  // 액세스 토큰과 리프레시 토큰 생성
  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
      providerId: user.providerId,
    };

    // 액세스 토큰 생성 (짧은 유효기간)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    // 리프레시 토큰 생성 (긴 유효기간)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        this.configService.get<string>('JWT_SECRET'),
      ),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // 리프레시 토큰 업데이트
  private async updateRefreshToken(userId: number, refreshToken: string) {
    // 리프레시 토큰 해싱
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // 사용자 업데이트
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);
  }

  // 리프레시 토큰 검증
  private async verifyRefreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          this.configService.get<string>('JWT_SECRET'),
        ),
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // 로그아웃 처리
  async logout(userId: number) {
    // 리프레시 토큰 제거
    await this.userService.updateRefreshToken(userId, null);
    return { message: '로그아웃되었습니다.' };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Generate new verification code
    const newVerificationCode =
      await this.userService.regenerateVerificationCode(email);

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      newVerificationCode,
    );

    return {
      message: 'Verification code resent',
      email: user.email,
    };
  }

  // 1단계: 이메일 유효성 검사
  async checkEmail(email: string) {
    try {
      // 이메일 형식 검사는 DTO에서 처리

      // 이미 검증된 이메일인지 확인
      const existingUser = await this.userService.findByEmail(email);

      if (existingUser && existingUser.isEmailVerified) {
        throw new ConflictException('이미 가입된 이메일입니다.');
      }

      return {
        isAvailable: true,
        message: '사용 가능한 이메일입니다.',
        email,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException('이메일 확인 중 오류가 발생했습니다.');
    }
  }

  // 2단계: 사용자 정보 입력 및 인증 코드 발송
  async register(registerDto: RegisterDto) {
    const { email, password, username, marketingConsent } = registerDto;

    try {
      // 임시 사용자 생성 또는 기존 사용자 정보 업데이트
      const user = await this.userService.createOrUpdatePendingUser({
        email,
        password,
        username,
        marketingConsent: marketingConsent || false,
        provider: AuthProvider.LOCAL,
      });

      // 인증 코드 발송
      await this.emailService.sendVerificationEmail(
        user.email,
        user.verificationToken,
      );

      return {
        message: '인증 코드가 이메일로 발송되었습니다.',
        email: user.email,
      };
    } catch {
      throw new BadRequestException('회원가입 중 오류가 발생했습니다.');
    }
  }

  // 3단계: 인증 코드 확인 및 최종 회원가입
  async completeRegistration(completeRegistrationDto: CompleteRegistrationDto) {
    const { email, code } = completeRegistrationDto;

    try {
      // 인증 코드 확인 및 사용자 활성화
      const user = await this.userService.verifyEmailAndActivateUser(
        email,
        code,
      );

      // 액세스 토큰과 리프레시 토큰 생성
      const tokens = await this.generateTokens(user);

      // 리프레시 토큰 저장
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        message: '회원가입이 완료되었습니다.',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('회원가입 완료 중 오류가 발생했습니다.');
    }
  }

  async updateUserInfo(userId: number, updateUserInfoDto: UpdateUserInfoDto) {
    const user = await this.userService.updateUserInfo(
      userId,
      updateUserInfoDto.username,
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 로컬 계정만 비밀번호 변경 가능
    if (user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException(
        '로컬 계정만 비밀번호 변경이 가능합니다.',
      );
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호 설정
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userService.updatePassword(userId, hashedPassword);

    return {
      message: '비밀번호가 성공적으로 변경되었습니다.',
    };
  }

  async deleteAccount(userId: number, deleteAccountDto: DeleteAccountDto) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 소셜 계정 확인
    if (user.provider !== AuthProvider.LOCAL) {
      // 소셜 계정은 비밀번호 검증 없이 삭제
      await this.userService.deleteAccount(userId);
      return { message: '계정이 성공적으로 삭제되었습니다.' };
    }

    // 로컬 계정은 비밀번호 검증 필요
    if (!user.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(
      deleteAccountDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // 계정 삭제
    await this.userService.deleteAccount(userId);

    return { message: '계정이 성공적으로 삭제되었습니다.' };
  }

  // 소셜 로그인 사용자를 위한 사용자 이름 생성
  private generateUsername(
    fullName: string | undefined,
    email: string | null,
    provider: AuthProvider,
  ): string {
    // 1. 이름이 제공된 경우 우선 사용
    if (fullName && fullName.trim()) {
      return fullName.trim();
    }

    // 2. 이메일이 있는 경우 이메일 아이디 부분 사용
    if (email) {
      const emailUsername = email.split('@')[0];
      return emailUsername;
    }

    // 3. 이메일이 없는 경우 기본 이름 생성
    if (
      provider === AuthProvider.APPLE &&
      (!fullName || !fullName.trim()) &&
      !email
    ) {
      // Apple의 경우, 첫 로그인 이후 이름/이메일 제공 안 할 수 있음
      // providerId 기반으로 고유한 이름을 생성하거나, 기본값을 더 구체화할 수 있음.
      // 여기서는 일단 기존 로직을 따르되, Apple임을 명시
      return 'Apple User';
    }
    return `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;
  }

  // Apple identityToken 검증 및 사용자 정보 추출
  private async verifyAppleTokenAndExtractUser(
    identityToken: string,
  ): Promise<OAuthUser> {
    try {
      this.logger.log('Starting Apple token verification');
      this.logger.log('Token length:', identityToken?.length);
      this.logger.log(
        'Token preview:',
        identityToken?.substring(0, 50) + '...',
      );

      const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
      if (!clientId) {
        this.logger.error(
          'Apple Client ID (APPLE_CLIENT_ID) is not configured.',
        );
        throw new BadRequestException('Apple 로그인 설정을 확인해주세요.');
      }

      this.logger.log('Using Apple Client ID:', clientId);

      // 토큰이 JWT 형식인지 확인
      if (!identityToken || !identityToken.includes('.')) {
        this.logger.error('Invalid token format - not a JWT:', identityToken);
        throw new UnauthorizedException('유효하지 않은 Apple 토큰 형식입니다.');
      }

      const decodedToken = await verifyAppleToken({
        idToken: identityToken,
        clientId: clientId,
        // nonce: 'OPTIONAL_NONCE_IF_USED_DURING_CLIENT_AUTH' // 클라이언트에서 nonce를 사용했다면 여기서도 동일한 값으로 검증 필요
      });

      this.logger.log('Apple token decoded successfully:', {
        sub: decodedToken?.sub,
        email: decodedToken?.email,
        aud: decodedToken?.aud,
        iss: decodedToken?.iss,
        exp: decodedToken?.exp,
        iat: decodedToken?.iat,
      });

      if (!decodedToken || !decodedToken.sub || !decodedToken.email) {
        this.logger.error(
          'Invalid Apple token or missing required claims (sub, email).',
          decodedToken,
        );
        throw new UnauthorizedException(
          '제공된 Apple 토큰이 유효하지 않거나 필수 정보가 부족합니다.',
        );
      }

      // Apple은 첫 로그인 시에만 이름 정보를 제공할 수 있습니다.
      // verify-apple-id-token 라이브러리는 이름 정보를 직접 파싱해주지 않으므로,
      // 이름이 필요하다면 클라이언트에서 identityToken과 함께 전달받거나, identityToken을 직접 디코딩하여 추출해야 합니다.
      // 여기서는 우선 이름 없이 진행합니다.
      const result = {
        providerId: decodedToken.sub, // Apple User ID
        email: decodedToken.email,
        // fullName: undefined, // 이름 정보는 클라이언트에서 받거나 추가 처리 필요
        accessToken: identityToken, // 원본 토큰을 전달하여 validateOAuthUser에서 사용 가능하도록
      };

      this.logger.log('Apple user extracted successfully:', {
        providerId: result.providerId,
        email: result.email,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Apple token verification failed: ${error.message}`,
        error.stack,
      );
      // verify-apple-id-token 에러 메시지를 좀 더 사용자 친화적으로 변경할 수 있음
      if (error.message && error.message.includes('is expired')) {
        throw new UnauthorizedException('Apple 토큰이 만료되었습니다.');
      }
      if (error.message && error.message.includes('audience invalid')) {
        throw new UnauthorizedException(
          'Apple 토큰의 대상(audience)이 잘못되었습니다. 설정(APPLE_CLIENT_ID)을 확인해주세요.',
        );
      }
      throw new UnauthorizedException('Apple 토큰을 검증하는데 실패했습니다.');
    }
  }

  // Apple authorization code를 ID 토큰으로 교환
  private async exchangeAppleCodeForToken(code: string): Promise<string> {
    try {
      this.logger.log('Starting Apple code exchange for token');
      this.logger.log('Authorization code:', code);

      const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
      const teamId = this.configService.get<string>('APPLE_TEAM_ID');
      const keyId = this.configService.get<string>('APPLE_KEY_ID');
      let privateKey = this.configService.get<string>('APPLE_PRIVATE_KEY');

      // Private key가 환경 변수에 없으면 파일에서 읽기
      if (!privateKey) {
        const privateKeyPath = this.configService.get<string>(
          'APPLE_PRIVATE_KEY_PATH',
        );
        if (privateKeyPath) {
          try {
            const fullPath = path.resolve(process.cwd(), privateKeyPath);
            privateKey = fs.readFileSync(fullPath, 'utf8');
            this.logger.log('Private key loaded from file:', fullPath);
          } catch (error) {
            this.logger.error(
              `Failed to read Apple private key from file: ${privateKeyPath}`,
              error,
            );
            throw new BadRequestException(
              'Apple private key 파일을 읽을 수 없습니다.',
            );
          }
        }
      } else {
        this.logger.log('Private key loaded from environment variable');
      }

      if (!clientId || !teamId || !keyId || !privateKey) {
        this.logger.error('Missing Apple configuration:', {
          hasClientId: !!clientId,
          hasTeamId: !!teamId,
          hasKeyId: !!keyId,
          hasPrivateKey: !!privateKey,
        });
        throw new BadRequestException('Apple 로그인 설정이 완전하지 않습니다.');
      }

      this.logger.log('Apple configuration loaded:', {
        clientId,
        teamId,
        keyId,
      });

      // Client secret 생성 (JWT)
      const clientSecret = jwt.sign(
        {
          iss: teamId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6개월
          aud: 'https://appleid.apple.com',
          sub: clientId,
        },
        privateKey.replace(/\\n/g, '\n'),
        {
          algorithm: 'ES256',
          keyid: keyId,
        },
      );

      this.logger.log('Client secret generated successfully');

      // Apple 토큰 엔드포인트로 요청
      const requestBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      });

      this.logger.log('Sending request to Apple token endpoint');

      const response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      this.logger.log('Apple token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Apple token exchange failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new UnauthorizedException('Apple 토큰 교환에 실패했습니다.');
      }

      const tokenData = await response.json();
      this.logger.log('Apple token response received:', {
        hasIdToken: !!tokenData.id_token,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type,
      });

      if (!tokenData.id_token) {
        this.logger.error('No id_token in Apple response:', tokenData);
        throw new UnauthorizedException('Apple에서 ID 토큰을 받지 못했습니다.');
      }

      this.logger.log('Apple code exchange successful');
      return tokenData.id_token;
    } catch (error) {
      this.logger.error('Apple code exchange error:', error.message);
      this.logger.error('Error stack:', error.stack);
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Apple 인증 코드 교환 중 오류가 발생했습니다.',
      );
    }
  }
}
