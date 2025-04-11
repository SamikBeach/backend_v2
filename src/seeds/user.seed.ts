import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { UserService } from '../user/user.service';
import { User, UserStatus, AuthProvider } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

interface UserSeed {
  email: string;
  password: string;
  username: string;
  isActive: boolean;
  marketingConsent: boolean;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('UserSeed');

  try {
    logger.log('사용자 초기 데이터 생성 시작...');

    // 직접 Repository 접근 방식 (비밀번호 암호화 등 서비스 로직 없이 raw 데이터 생성)
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    // UserService 사용 방식 (비밀번호 암호화 등 서비스 로직 포함)
    const userService = app.get(UserService);

    // 기존 사용자 존재 여부 확인
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      logger.log(
        `이미 ${existingUsers}명의 사용자가 존재합니다. 시드 작업을 건너뜁니다.`,
      );
      await app.close();
      return;
    }

    // 테스트용 사용자 데이터
    const users: UserSeed[] = [
      {
        email: 'user1@example.com',
        password: 'password123',
        username: '사용자1',
        isActive: true,
        marketingConsent: true,
      },
      {
        email: 'user2@example.com',
        password: 'password123',
        username: '사용자2',
        isActive: true,
        marketingConsent: false,
      },
      {
        email: 'user3@example.com',
        password: 'password123',
        username: '사용자3',
        isActive: true,
        marketingConsent: true,
      },
      {
        email: 'inactive@example.com',
        password: 'password123',
        username: '비활성 사용자',
        isActive: false,
        marketingConsent: false,
      },
    ];

    // 사용자 생성
    for (const userData of users) {
      try {
        // 비밀번호 해싱
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // 직접 사용자 생성 (UserService 사용하지 않고 저장소에 직접 저장)
        const user = userRepository.create({
          email: userData.email,
          password: hashedPassword,
          username: userData.username,
          status: userData.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
          isEmailVerified: true, // 시드 데이터이므로 이메일 인증 완료 상태로 설정
          marketingConsent: userData.marketingConsent,
          provider: AuthProvider.LOCAL,
        });

        await userRepository.save(user);

        logger.log(`사용자 ${userData.email} 생성 완료 (상태: ${user.status})`);
      } catch (error) {
        logger.error(`사용자 ${userData.email} 생성 중 오류: ${error.message}`);
      }
    }

    // 소셜 로그인 사용자 추가 (예시)
    try {
      // 소셜 로그인 사용자 (Google)
      const googleUser = userRepository.create({
        email: 'google@example.com',
        username: 'Google 사용자',
        provider: AuthProvider.GOOGLE,
        providerId: 'google-mock-id-123456',
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        marketingConsent: false,
      });
      await userRepository.save(googleUser);
      logger.log(`Google 소셜 로그인 사용자 생성 완료`);

      // 소셜 로그인 사용자 (Apple)
      const appleUser = userRepository.create({
        email: 'apple@example.com',
        username: 'Apple 사용자',
        provider: AuthProvider.APPLE,
        providerId: 'apple-mock-id-123456',
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        marketingConsent: false,
      });
      await userRepository.save(appleUser);
      logger.log(`Apple 소셜 로그인 사용자 생성 완료`);
    } catch (error) {
      logger.error(`소셜 로그인 사용자 생성 중 오류: ${error.message}`);
    }

    logger.log('사용자 초기 데이터 생성 완료!');
  } catch (error) {
    logger.error(`사용자 초기화 중 오류: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
