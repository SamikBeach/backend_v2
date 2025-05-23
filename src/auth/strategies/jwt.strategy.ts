import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      this.logger.log('🔐 JWT Strategy 검증 시작');
      this.logger.log('JWT 페이로드:', JSON.stringify(payload, null, 2));

      const user = await this.authService.validateJwtPayload(payload);

      this.logger.log('🎉 JWT Strategy 검증 성공:', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error('❌ JWT Strategy 검증 실패:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
