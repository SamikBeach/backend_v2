import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '고전산책 이메일 인증',
        html: `
          <div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <h2 style="color: #333; text-align: center;">고전산책 이메일 인증</h2>
            <p style="color: #666; line-height: 1.6;">안녕하세요, 고전산책입니다.</p>
            <p style="color: #666; line-height: 1.6;">아래 인증 코드를 입력하여 이메일 인증을 완료해주세요.</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; padding: 15px 30px; background-color: #f8f8f8; border-radius: 5px; letter-spacing: 4px; font-size: 24px; font-weight: bold; color: #333;">${verificationCode}</div>
            </div>
            <p style="color: #666; line-height: 1.6;">이 코드는 3분 동안 유효합니다.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">본 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
          </div>
        `,
      });

      this.logger.log(
        `[이메일 인증] ${email}로 인증 코드가 발송되었습니다: ${verificationCode}`,
      );
    } catch (error) {
      this.logger.error(
        `이메일 발송 실패 (${email}): ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '고전산책 비밀번호 재설정',
        html: `
          <div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <h2 style="color: #333; text-align: center;">고전산책 비밀번호 재설정</h2>
            <p style="color: #666; line-height: 1.6;">안녕하세요, 고전산책입니다.</p>
            <p style="color: #666; line-height: 1.6;">비밀번호 재설정을 요청하셨습니다. 아래 인증 코드를 입력하여 비밀번호를 재설정해주세요.</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; padding: 15px 30px; background-color: #f8f8f8; border-radius: 5px; letter-spacing: 4px; font-size: 24px; font-weight: bold; color: #333;">${resetToken}</div>
            </div>
            <p style="color: #666; line-height: 1.6;">이 인증 코드는 1시간 동안 유효합니다.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">본 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
          </div>
        `,
      });

      this.logger.log(
        `[비밀번호 재설정] ${email}로 인증 코드가 발송되었습니다: ${resetToken}`,
      );
    } catch (error) {
      this.logger.error(
        `이메일 발송 실패 (${email}): ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to send password reset email');
    }
  }
}
