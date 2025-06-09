import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Res,
  Logger,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import {
  ResetPasswordDto,
  RequestPasswordResetDto,
  VerifyResetTokenDto,
} from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserService } from '../user/user.service';
import { CheckEmailDto } from './dto/check-email.dto';
import { RegisterDto } from './dto/register.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '../user/entities/user.entity';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { IsPublic } from './decorators/is-public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  // 클라이언트 타입 감지 헬퍼 메서드
  private detectClientType(req: any, query?: any): 'web' | 'mobile' {
    // 1. Query parameter에서 확인
    if (query?.client_type)
      return query.client_type === 'mobile' ? 'mobile' : 'web';

    // 2. Request에 저장된 값 확인 (OAuth 시작 시 저장)
    if (req.clientType) return req.clientType === 'mobile' ? 'mobile' : 'web';

    // 3. User-Agent 기반 감지
    const userAgent = req.headers['user-agent'];
    if (userAgent?.includes('Mobile') || userAgent?.includes('Expo')) {
      return 'mobile';
    }

    return 'web';
  }

  @Post('login')
  @IsPublic()
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @IsPublic()
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  async logout(@GetUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('social-login')
  @IsPublic()
  async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
    return this.authService.socialLogin(socialLoginDto);
  }

  @Post('signup')
  @IsPublic()
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('check-email')
  @IsPublic()
  checkEmail(@Body() checkEmailDto: CheckEmailDto) {
    return this.authService.checkEmail(checkEmailDto.email);
  }

  @Post('register')
  @IsPublic()
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('complete-registration')
  @IsPublic()
  async completeRegistration(
    @Body() completeRegistrationDto: CompleteRegistrationDto,
  ) {
    return this.authService.completeRegistration(completeRegistrationDto);
  }

  @Post('verify-email')
  @IsPublic()
  async verifyEmail(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyEmail(
      verifyCodeDto.email,
      verifyCodeDto.code,
    );
  }

  @Post('resend-verification')
  @IsPublic()
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationCode(email);
  }

  @Post('request-password-reset')
  @IsPublic()
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @Post('verify-reset-token')
  @IsPublic()
  async verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
    return this.authService.verifyResetToken(
      verifyResetTokenDto.email,
      verifyResetTokenDto.token,
    );
  }

  @Post('reset-password')
  @IsPublic()
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('update-user-info')
  async updateUserInfo(
    @GetUser() user: User,
    @Body() updateUserInfoDto: UpdateUserInfoDto,
  ) {
    return this.authService.updateUserInfo(user.id, updateUserInfoDto);
  }

  @Post('change-password')
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post('delete-account')
  async deleteAccount(
    @GetUser() user: User,
    @Body() deleteAccountDto: DeleteAccountDto,
  ) {
    return this.authService.deleteAccount(user.id, deleteAccountDto);
  }

  @Get('google')
  @IsPublic()
  @UseGuards(AuthGuard('google'))
  googleAuth(@Req() req: any, @Query('client_type') clientType?: string) {
    // 클라이언트 타입을 request에 저장하여 콜백에서 사용
    req.clientType = clientType;
    // Google 인증 페이지로 리다이렉트 (Passport가 처리)
  }

  @Get('google/callback')
  @IsPublic()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @GetUser() user: User,
    @Res() res: Response,
    @Req() req: any,
    @Query() query: any,
  ) {
    try {
      const result = await this.authService.socialLogin({
        provider: AuthProvider.GOOGLE,
        user,
      });

      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        // 모바일: Deep Link로 리다이렉트
        const deepLinkUrl = `miyuk-books://auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
        res.redirect(deepLinkUrl);
      } else {
        // 웹: 기존 방식 유지
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
      }
    } catch (error) {
      this.logger.error('Google callback error:', error);
      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?error=${encodeURIComponent(error.message)}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?error=${encodeURIComponent(error.message)}`,
        );
      }
    }
  }

  @Get('naver')
  @IsPublic()
  @UseGuards(AuthGuard('naver'))
  naverAuth(@Req() req: any, @Query('client_type') clientType?: string) {
    req.clientType = clientType;
    // Naver 인증 페이지로 리다이렉트 (Passport가 처리)
  }

  @Get('naver/callback')
  @IsPublic()
  @UseGuards(AuthGuard('naver'))
  async naverAuthCallback(
    @GetUser() user: User,
    @Res() res: Response,
    @Req() req: any,
    @Query() query: any,
  ) {
    try {
      const result = await this.authService.socialLogin({
        provider: AuthProvider.NAVER,
        user,
      });

      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
      }
    } catch (error) {
      this.logger.error('Naver callback error:', error);
      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?error=${encodeURIComponent(error.message)}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?error=${encodeURIComponent(error.message)}`,
        );
      }
    }
  }

  @Get('kakao')
  @IsPublic()
  @UseGuards(AuthGuard('kakao'))
  kakaoAuth(@Req() req: any, @Query('client_type') clientType?: string) {
    req.clientType = clientType;
    // 카카오 인증 페이지로 리다이렉트 (Passport가 처리)
  }

  @Get('kakao/callback')
  @IsPublic()
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(
    @GetUser() user: User,
    @Res() res: Response,
    @Req() req: any,
    @Query() query: any,
  ) {
    try {
      const result = await this.authService.socialLogin({
        provider: AuthProvider.KAKAO,
        user,
      });

      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
      }
    } catch (error) {
      this.logger.error('Kakao callback error:', error);
      const clientType = this.detectClientType(req, query);

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?error=${encodeURIComponent(error.message)}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?error=${encodeURIComponent(error.message)}`,
        );
      }
    }
  }

  @Get('apple')
  @IsPublic()
  async appleAuth(
    @Res() res: Response,
    @Query('client_type') clientType?: string,
  ) {
    try {
      const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
      const callbackUrl = this.configService.get<string>('APPLE_CALLBACK_URL');

      if (!clientId || !callbackUrl) {
        throw new BadRequestException('Apple 로그인 설정이 완전하지 않습니다.');
      }

      // Apple 인증 URL 생성
      const state = Math.random().toString(36).substring(2, 15);
      // 클라이언트 타입도 state에 포함
      const stateWithClientType = `${state}_${clientType || 'web'}`;

      const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');
      appleAuthUrl.searchParams.append('client_id', clientId);
      appleAuthUrl.searchParams.append('redirect_uri', callbackUrl);
      appleAuthUrl.searchParams.append('response_type', 'code');
      appleAuthUrl.searchParams.append('scope', 'name email');
      appleAuthUrl.searchParams.append('response_mode', 'form_post');
      appleAuthUrl.searchParams.append('state', stateWithClientType);

      this.logger.log(
        'Redirecting to Apple auth URL:',
        appleAuthUrl.toString(),
      );
      res.redirect(appleAuthUrl.toString());
    } catch (error) {
      this.logger.error('Apple auth redirect error:', error);
      throw new BadRequestException(
        'Apple 로그인 초기화 중 오류가 발생했습니다.',
      );
    }
  }

  @Post('apple/callback')
  @IsPublic()
  async appleAuthCallback(@Body() body: any, @Res() res: Response) {
    try {
      this.logger.log(
        'Apple callback received - Raw body:',
        JSON.stringify(body, null, 2),
      );

      const { code, id_token, user, state } = body;

      // state에서 클라이언트 타입 추출
      const clientType = state?.includes('_mobile') ? 'mobile' : 'web';

      // Apple에서 전달받은 모든 데이터 로깅
      this.logger.log('Apple callback data:', {
        hasCode: !!code,
        hasIdToken: !!id_token,
        hasUser: !!user,
        state: state,
        userType: typeof user,
        userContent: user,
        clientType: clientType,
      });

      if (!code && !id_token) {
        throw new BadRequestException(
          'Apple 인증 코드 또는 ID 토큰이 필요합니다.',
        );
      }

      let result;
      let userInfo = null;

      // user 데이터가 문자열인 경우 파싱
      if (user) {
        try {
          userInfo = typeof user === 'string' ? JSON.parse(user) : user;
          this.logger.log('Parsed user info:', userInfo);
        } catch (parseError) {
          this.logger.warn('Failed to parse user data:', parseError);
          userInfo = null;
        }
      }

      if (id_token) {
        // ID 토큰이 직접 제공된 경우 (모바일 앱에서)
        this.logger.log('Processing with id_token');
        result = await this.authService.socialLogin({
          provider: AuthProvider.APPLE,
          accessToken: id_token,
          user: userInfo,
        });
      } else if (code) {
        // Authorization code가 제공된 경우 (웹에서)
        this.logger.log('Processing with authorization code');
        result = await this.authService.socialLogin({
          provider: AuthProvider.APPLE,
          code: code,
          user: userInfo,
        });
      }

      this.logger.log('Apple login successful, redirecting to frontend');

      if (clientType === 'mobile') {
        // 모바일: Deep Link로 리다이렉트
        const deepLinkUrl = `miyuk-books://auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
        res.redirect(deepLinkUrl);
      } else {
        // 웹: 기존 방식 유지
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
      }
    } catch (error) {
      this.logger.error('Apple callback error:', error.message);
      this.logger.error('Error stack:', error.stack);

      const clientType = body?.state?.includes('_mobile') ? 'mobile' : 'web';

      if (clientType === 'mobile') {
        const deepLinkUrl = `miyuk-books://auth/callback?error=${encodeURIComponent(error.message)}`;
        res.redirect(deepLinkUrl);
      } else {
        const frontendUrl = this.configService.get<string>('SERVICE_URL');
        res.redirect(
          `${frontendUrl}/auth/social-callback?error=${encodeURIComponent(error.message)}`,
        );
      }
    }
  }

  @Get('token-test')
  async tokenTest(@GetUser() user: User) {
    return {
      success: true,
      message: '토큰이 유효합니다.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
