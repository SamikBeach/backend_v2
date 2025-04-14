import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, AuthProvider } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { randomBytes } from 'crypto';
import { UserDetailResponseDto } from './dto/user.dto';
import { Library } from '../library/entities/library.entity';
import { Review } from '../review/entities/review.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findByProviderId(
    providerId: string,
    provider: AuthProvider,
  ): Promise<User | null> {
    return this.userRepository.findOneBy({ providerId, provider });
  }

  async createLocalUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, username, marketingConsent } = createUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      // 이미 존재하는 사용자인 경우, 기존 사용자 정보를 반환
      // 이메일 인증이 완료되지 않은 경우에만 재인증 가능하도록 함
      if (existingUser.isEmailVerified) {
        throw new ConflictException('Email already exists and verified');
      }

      // 기존 사용자의 인증 토큰 업데이트
      const verificationToken = this.generateVerificationCode();
      existingUser.verificationToken = verificationToken;
      existingUser.status = UserStatus.PENDING;

      return this.userRepository.save(existingUser);
    }

    // Hash password
    const hashedPassword = password ? await this.hashPassword(password) : null;

    // Generate verification code (6 digits)
    const verificationToken = this.generateVerificationCode();

    // Create new user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      provider: AuthProvider.LOCAL,
      status: UserStatus.PENDING,
      verificationToken,
      marketingConsent: marketingConsent || false,
    });

    return this.userRepository.save(user);
  }

  async createSocialUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, username, provider, providerId, marketingConsent } =
      createUserDto;

    // Create new user
    const user = this.userRepository.create({
      email,
      username,
      provider,
      providerId,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      marketingConsent: marketingConsent || false,
    });

    return this.userRepository.save(user);
  }

  async verifyEmail(email: string, code: string): Promise<User> {
    // 코드 중복을 방지하기 위해 verifyEmailAndActivateUser 메서드를 사용합니다.
    return this.verifyEmailAndActivateUser(email, code);
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 6자리 비밀번호 재설정 코드 생성
    const resetToken = this.generateResetCode();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.save(user);

    return resetToken;
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      throw new ConflictException('Invalid reset token');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new ConflictException('Reset token has expired');
    }

    user.password = await this.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    return this.userRepository.save(user);
  }

  /**
   * 소셜 로그인 계정에 비밀번호를 설정하고 로컬 로그인 방식을 추가합니다.
   * 이를 통해 소셜 로그인 계정이 이메일/비밀번호로도 로그인할 수 있게 됩니다.
   */
  async resetPasswordAndAddLocalProvider(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      throw new ConflictException('Invalid reset token');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new ConflictException('Reset token has expired');
    }

    // 소셜 로그인 계정이 아니면 일반 비밀번호 재설정 프로세스로 전환
    if (
      user.provider !== AuthProvider.GOOGLE &&
      user.provider !== AuthProvider.APPLE
    ) {
      return this.resetPassword(email, token, newPassword);
    }

    // 비밀번호 해싱 및 저장
    user.password = await this.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    // 원래 소셜 제공자 정보 보존 (providerId 등)
    // 이메일이 이미 확인되었기 때문에 status는 변경하지 않음

    return this.userRepository.save(user);
  }

  async updateUserInfo(id: number, username: string): Promise<User> {
    const user = await this.findOne(id);

    if (username) {
      user.username = username;
    }

    return this.userRepository.save(user);
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<User> {
    const user = await this.findOne(userId);
    user.refreshToken = refreshToken;
    return this.userRepository.save(user);
  }

  async regenerateVerificationCode(email: string): Promise<string> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Generate new verification code
    const verificationCode = this.generateVerificationCode();
    user.verificationToken = verificationCode;

    await this.userRepository.save(user);

    return verificationCode;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private generateVerificationCode(): string {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateResetCode(): string {
    // Generate a 6-digit code for password reset
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // 임시 사용자 생성 또는 업데이트하는 메서드 (회원가입 2단계)
  async createOrUpdatePendingUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, username, marketingConsent, provider } =
      createUserDto;

    // 기존 사용자 확인
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      // 이미 이메일이 인증된 사용자라면 에러
      if (existingUser.isEmailVerified) {
        throw new ConflictException('이미 가입된 이메일입니다.');
      }

      // 인증되지 않은 사용자라면 정보 업데이트
      const hashedPassword = password
        ? await this.hashPassword(password)
        : existingUser.password;
      const verificationToken = this.generateVerificationCode();

      existingUser.username = username || existingUser.username;
      existingUser.password = hashedPassword;
      existingUser.verificationToken = verificationToken;
      existingUser.status = UserStatus.PENDING;
      existingUser.marketingConsent =
        marketingConsent !== undefined
          ? marketingConsent
          : existingUser.marketingConsent;

      return this.userRepository.save(existingUser);
    }

    // 새 사용자 생성
    const hashedPassword = password ? await this.hashPassword(password) : null;
    const verificationToken = this.generateVerificationCode();

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      provider: provider || AuthProvider.LOCAL,
      status: UserStatus.PENDING,
      verificationToken,
      marketingConsent: marketingConsent || false,
    });

    return this.userRepository.save(user);
  }

  // 이메일 인증 및 사용자 활성화 (회원가입 3단계)
  async verifyEmailAndActivateUser(email: string, code: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 이미 인증된 사용자인 경우
    if (user.isEmailVerified) {
      return user;
    }

    // 인증 코드 확인
    if (user.verificationToken !== code) {
      throw new UnauthorizedException('인증 코드가 올바르지 않습니다.');
    }

    // 사용자 활성화
    user.isEmailVerified = true;
    user.status = UserStatus.ACTIVE;
    user.verificationToken = null;

    return this.userRepository.save(user);
  }

  async getUserProfile(
    id: number,
    isOwnProfile: boolean,
  ): Promise<UserDetailResponseDto> {
    try {
      console.log(
        `getUserProfile called for id=${id}, isOwnProfile=${isOwnProfile}`,
      );

      // 1. 사용자 기본 정보 로드
      const user = await this.userRepository.findOne({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // 2. 카운트 정보 초기화
      let libraryCount = 0;
      let readCount = 0;
      let reviewCount = 0;
      let subscribedLibraryCount = 0;

      // 3. 사용자의 서재 정보 조회
      try {
        const libraryQueryResult = await this.userRepository.manager.query(
          `SELECT COUNT(id) as count FROM library WHERE owner_id = ?`,
          [id],
        );
        libraryCount = parseInt(libraryQueryResult[0]?.count || '0', 10);

        // 다른 사용자의 프로필을 볼 때는 공개 서재만 카운트
        if (!isOwnProfile) {
          const publicLibraryQueryResult =
            await this.userRepository.manager.query(
              `SELECT COUNT(id) as count FROM library WHERE owner_id = ? AND is_public = true`,
              [id],
            );
          libraryCount = parseInt(
            publicLibraryQueryResult[0]?.count || '0',
            10,
          );
        }
      } catch (error) {
        console.error('Error getting library count:', error);
      }

      // 4. 읽은 책 권수 조회
      try {
        const bookCountQuery = isOwnProfile
          ? `SELECT COUNT(lb.id) as count FROM library_book lb
             JOIN library l ON lb.library_id = l.id
             WHERE l.owner_id = ?`
          : `SELECT COUNT(lb.id) as count FROM library_book lb
             JOIN library l ON lb.library_id = l.id
             WHERE l.owner_id = ? AND l.is_public = true`;

        const readCountResult = await this.userRepository.manager.query(
          bookCountQuery,
          [id],
        );
        readCount = parseInt(readCountResult[0]?.count || '0', 10);
      } catch (error) {
        console.error('Error getting read book count:', error);
      }

      // 5. 리뷰 개수 조회
      try {
        const reviewCountResult = await this.userRepository.manager.query(
          `SELECT COUNT(id) as count FROM review WHERE author_id = ?`,
          [id],
        );
        reviewCount = parseInt(reviewCountResult[0]?.count || '0', 10);
      } catch (error) {
        console.error('Error getting review count:', error);
      }

      // 6. 구독중인 서재 개수 조회
      try {
        const subscriptionCountResult = await this.userRepository.manager.query(
          `SELECT COUNT(*) as count FROM library_subscription WHERE subscriber_id = ?`,
          [id],
        );
        subscribedLibraryCount = parseInt(
          subscriptionCountResult[0]?.count || '0',
          10,
        );
      } catch (error) {
        console.error('Error getting subscription count:', error);
      }

      console.log(
        `Profile counts - libraries: ${libraryCount}, books: ${readCount}, reviews: ${reviewCount}, subscriptions: ${subscribedLibraryCount}`,
      );

      // 7. 프로필 데이터 반환
      return {
        user: {
          id: user.id,
          username: user.username || '사용자',
          email: isOwnProfile ? user.email : undefined,
          provider: user.provider,
          createdAt: user.createdAt,
        },
        libraryCount,
        readCount,
        subscribedLibraryCount,
        reviewCount,
        followers: 0, // 추후 구현 예정
        following: 0, // 추후 구현 예정
        isEditable: isOwnProfile,
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw error;
    }
  }
}
