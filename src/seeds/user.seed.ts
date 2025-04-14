import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { User, UserStatus, AuthProvider } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

interface UserSeed {
  id?: number; // ID를 명시적으로 지정할 수 있도록 추가
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

    // 기존 사용자 존재 여부 확인
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      logger.log(
        `이미 ${existingUsers}명의 사용자가 존재합니다. 시드 작업을 건너뜁니다.`,
      );
      await app.close();
      return;
    }

    // 테스트용 사용자 데이터 (10개의 사용자 데이터 생성)
    const users: UserSeed[] = [
      {
        id: 1,
        email: 'user1@example.com',
        password: 'password123',
        username: '책벌레',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 2,
        email: 'user2@example.com',
        password: 'password123',
        username: '문학소녀',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 3,
        email: 'user3@example.com',
        password: 'password123',
        username: '고전광',
        isActive: true,
        marketingConsent: false,
      },
      {
        id: 4,
        email: 'user4@example.com',
        password: 'password123',
        username: '철학자',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 5,
        email: 'user5@example.com',
        password: 'password123',
        username: '역사탐험가',
        isActive: true,
        marketingConsent: false,
      },
      {
        id: 6,
        email: 'user6@example.com',
        password: 'password123',
        username: '독서마니아',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 7,
        email: 'user7@example.com',
        password: 'password123',
        username: '서재지기',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 8,
        email: 'user8@example.com',
        password: 'password123',
        username: '지식탐험가',
        isActive: true,
        marketingConsent: false,
      },
      {
        id: 9,
        email: 'user9@example.com',
        password: 'password123',
        username: '책향기',
        isActive: true,
        marketingConsent: true,
      },
      {
        id: 10,
        email: 'user10@example.com',
        password: 'password123',
        username: '문장수집가',
        isActive: true,
        marketingConsent: true,
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
          id: userData.id, // ID를 명시적으로 설정
          email: userData.email,
          password: hashedPassword,
          username: userData.username,
          status: userData.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
          isEmailVerified: true, // 시드 데이터이므로 이메일 인증 완료 상태로 설정
          marketingConsent: userData.marketingConsent,
          provider: AuthProvider.LOCAL,
        });

        await userRepository.save(user);

        logger.log(
          `사용자 ${userData.email} (ID: ${userData.id}) 생성 완료 (상태: ${user.status})`,
        );
      } catch (error) {
        logger.error(`사용자 ${userData.email} 생성 중 오류: ${error.message}`);
      }
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
