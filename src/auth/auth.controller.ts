import { Controller, Post, Body, UseGuards, Get, Res } from '@nestjs/common';
import { Response } from 'express';
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
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

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
  googleAuth() {
    // Google 인증 페이지로 리다이렉트 (Passport가 처리)
  }

  @Get('google/callback')
  @IsPublic()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@GetUser() user: User, @Res() res: Response) {
    const result = await this.authService.socialLogin({
      provider: AuthProvider.GOOGLE,
      user,
    });

    // 프론트엔드로 리다이렉트 (토큰과 함께)
    const frontendUrl = this.configService.get<string>('SERVICE_URL');
    res.redirect(
      `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }

  @Get('apple')
  @IsPublic()
  @UseGuards(AuthGuard('apple'))
  appleAuth() {
    // Apple 인증 페이지로 리다이렉트 (Passport가 처리)
  }

  @Post('apple/callback')
  @IsPublic()
  @UseGuards(AuthGuard('apple'))
  async appleAuthCallback(@GetUser() user: User, @Res() res: Response) {
    const result = await this.authService.socialLogin({
      provider: AuthProvider.APPLE,
      user,
    });

    // 프론트엔드로 리다이렉트 (토큰과 함께)
    const frontendUrl = this.configService.get<string>('SERVICE_URL');
    res.redirect(
      `${frontendUrl}/auth/social-callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }
}
