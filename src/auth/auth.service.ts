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

// OAuth 사용자 정보 인터페이스
interface OAuthUser {
  email: string;
  fullName?: string;
  profilePhoto?: string;
  providerId: string;
  accessToken: string;
}

@Injectable()
export class AuthService {
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
      const { provider, accessToken, code } = socialLoginDto;

      // 이미 Passport 전략에서 사용자 검증이 완료된 경우
      if (socialLoginDto.user) {
        return this.generateAuthResponseWithRefresh(socialLoginDto.user);
      }

      // Apple 인증 코드가 있는 경우 (Apple 로그인 전용)
      if (provider === AuthProvider.APPLE && code) {
        // 임시 사용자 식별자 생성
        const tempId = Math.random().toString(36).substring(2, 15);

        // 사용자 정보 생성
        const tempUser = {
          email: `apple_user_${tempId}@example.com`,
          fullName: `Apple User ${tempId}`,
          providerId: `apple_${Date.now()}`,
          accessToken: code, // code를 accessToken으로 사용
        };

        // OAuth 인증 처리
        const user = await this.validateOAuthUser(tempUser, 'apple');

        return this.generateAuthResponseWithRefresh(user);
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
            // 모바일에서 직접 Apple OAuth 처리 후 서버에 토큰 전달 시
            throw new BadRequestException(
              '소셜 로그인은 웹 경로를 통해 인증해야 합니다.',
            );
          default:
            throw new BadRequestException('지원하지 않는 인증 제공자입니다.');
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
    const isSocialAccount =
      user.provider === AuthProvider.GOOGLE ||
      user.provider === AuthProvider.APPLE;

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
    if (
      user.provider === AuthProvider.GOOGLE ||
      user.provider === AuthProvider.APPLE
    ) {
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
      const isSocialAccount =
        user.provider === AuthProvider.GOOGLE ||
        user.provider === AuthProvider.APPLE;

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

    const user = await this.userService.findByEmail(payload.email);

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

      // 이메일 필수 체크
      if (!email) {
        throw new UnauthorizedException(
          '소셜 로그인에 필요한 이메일 정보를 획득하지 못했습니다.',
        );
      }

      // 올바른 제공자 체크
      const authProvider = this.getAuthProviderFromString(provider);
      if (!authProvider) {
        throw new BadRequestException('지원하지 않는 인증 제공자입니다.');
      }

      // providerId 체크
      const userProviderId = providerId || `${provider}_${Date.now()}`;

      // providerId로 사용자 검색
      let user = await this.userService.findByProviderId(
        userProviderId,
        authProvider,
      );

      // 이메일로도 검색 (Apple의 경우 providerId가 매번 변경될 수 있음)
      if (!user && authProvider === AuthProvider.APPLE) {
        const usersByEmail = await this.userService.findByEmail(email);
        if (usersByEmail && usersByEmail.provider === AuthProvider.APPLE) {
          user = usersByEmail;
        }
      }

      // 기존 사용자가 없는 경우
      if (!user) {
        // 같은 이메일로 가입한 사용자가 있는지 확인
        const existingUser = await this.userService.findByEmail(email);

        if (existingUser) {
          // 같은 이메일로 다른 방식(로컬 또는 다른 소셜)으로 가입한 경우
          throw new ConflictException(
            '이미 다른 방식으로 가입된 이메일입니다. 다른 로그인 방식을 이용해주세요.',
          );
        }

        // 새 사용자 생성
        user = await this.userService.createSocialUser({
          email,
          username: fullName || email.split('@')[0], // 이름이 없으면 이메일 아이디 부분 사용
          provider: authProvider,
          providerId: userProviderId,
          marketingConsent: false,
        });
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // 문자열로부터 AuthProvider enum 값 반환
  private getAuthProviderFromString(provider: string): AuthProvider | null {
    switch (provider.toLowerCase()) {
      case 'google':
        return AuthProvider.GOOGLE;
      case 'apple':
        return AuthProvider.APPLE;
      case 'naver':
        return AuthProvider.NAVER;
      case 'kakao':
        return AuthProvider.KAKAO;
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
}
