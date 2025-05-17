import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '미역서점 이메일 인증',
        html: `
        <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #fff;">
          <h2 style="color: #333; text-align: center;">미역서점 이메일 인증</h2>
          <p style="color: #666; line-height: 1.6;">안녕하세요, 미역서점입니다.</p>
          <p style="color: #666; line-height: 1.6;">회원가입을 완료하기 위해 아래 인증 코드를 입력해주세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 12px 24px; font-size: 18px; font-weight: bold; letter-spacing: 5px; background-color: #f5f5f5; border-radius: 5px; color: #333;">${code}</div>
          </div>
          <p style="color: #666; line-height: 1.6;">인증 코드는 1시간 동안 유효합니다.</p>
          <p style="color: #666; line-height: 1.6;">감사합니다.</p>
        </div>
      `,
      });
      return true;
    } catch (error) {
      this.logger.error(`이메일 인증 코드 전송 실패: ${error.message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetCode: string,
  ): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '미역서점 비밀번호 재설정',
        html: `
        <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #fff;">
          <h2 style="color: #333; text-align: center;">미역서점 비밀번호 재설정</h2>
          <p style="color: #666; line-height: 1.6;">안녕하세요, 미역서점입니다.</p>
          <p style="color: #666; line-height: 1.6;">비밀번호 재설정을 위해 아래 인증 코드를 입력해주세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 12px 24px; font-size: 18px; font-weight: bold; letter-spacing: 5px; background-color: #f5f5f5; border-radius: 5px; color: #333;">${resetCode}</div>
          </div>
          <p style="color: #666; line-height: 1.6;">인증 코드는 1시간 동안 유효합니다.</p>
          <p style="color: #666; line-height: 1.6;">감사합니다.</p>
        </div>
      `,
      });
      return true;
    } catch (error) {
      this.logger.error(`이메일 발송 실패 (${email}): ${error.message}`);
      return false;
    }
  }
}
