import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, AuthProvider } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { randomBytes } from 'crypto';
import {
  UserDetailResponseDto,
  FollowersListResponseDto,
  FollowingListResponseDto,
  FollowerResponseDto,
  LibraryPreviewDto,
  UpdateUserDto,
  ExtendedBookInfoDto,
  ExtendedReadingStatusResponseDto,
} from './dto/user.dto';
import { Library } from '../library/entities/library.entity';
import { Review } from '../review/entities/review.entity';
import { UserFollower } from './entities/user-follower.entity';
import {
  ReadingStatus,
  ReadingStatusType,
} from '../reading-status/entities/reading-status.entity';
import { LibrarySubscription } from '../library/entities/library-subscription.entity';
import { LibraryBook } from '../library/entities/library-book.entity';
import { ReadingStatusService } from '../reading-status/reading-status.service';
import { ReadingStatusResponseDto } from '../reading-status/dto/reading-status.dto';
import { FileService } from '../common/services/file.service';
import { ConfigService } from '@nestjs/config';
import { Book } from '../book/entities/book.entity';
import { In } from 'typeorm';
import { ReviewResponseDto } from '../review/dto/review-response.dto';
import { ReviewImage } from '../review/entities/review-image.entity';
import { ReviewBook } from '../review/entities/review-book.entity';
import { BookService } from '../book/book.service';

@Injectable()
export class UserService {
  private serverUrl: string;
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserFollower)
    private userFollowerRepository: Repository<UserFollower>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(ReviewImage)
    private reviewImageRepository: Repository<ReviewImage>,
    @InjectRepository(ReviewBook)
    private reviewBookRepository: Repository<ReviewBook>,
    @Inject(forwardRef(() => ReadingStatusService))
    private readingStatusService: ReadingStatusService,
    @Inject(forwardRef(() => BookService))
    private bookService: BookService,
    private fileService: FileService,
    private configService: ConfigService,
  ) {
    this.serverUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3001';
  }

  // 이미지 URL이 상대 경로인 경우 전체 URL로 변환하는 유틸리티 메소드
  private ensureFullImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl; // 이미 전체 URL이면 그대로 반환

    // 상대 경로인 경우 서버 URL 추가
    if (imageUrl.startsWith('/uploads/')) {
      return `${this.serverUrl}${imageUrl}`;
    } else if (imageUrl.startsWith('uploads/')) {
      return `${this.serverUrl}/${imageUrl}`;
    }

    return imageUrl;
  }

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

  async updateUserInfo(
    id: number,
    username: string,
    bio?: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    if (username) {
      user.username = username;
    }

    if (bio !== undefined) {
      user.bio = bio;
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
    currentUserId?: number,
  ): Promise<UserDetailResponseDto> {
    const user = await this.findOne(id);

    // 구독자 수(팔로워 수) 조회
    const followersCount = await this.userFollowerRepository.count({
      where: { following_id: id },
    });

    // 팔로잉 수 조회
    const followingCount = await this.userFollowerRepository.count({
      where: { follower_id: id },
    });

    // 현재 사용자가 이 사용자를 팔로우하고 있는지 확인
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await this.isFollowing(currentUserId, id);
    }

    // 라이브러리 수 조회
    const libraryCount = await this.getLibraryCount(id);

    // 리뷰 수 조회
    const reviewCount = await this.getReviewCount(id);

    // 읽은 책 수 조회
    const readCount = await this.getReadCount(id);

    // 구독 중인 라이브러리 수 조회
    const subscribedLibraryCount = await this.getSubscribedLibraryCount(id);

    // 사용자의 대표 라이브러리 조회 (상위 3개)
    const libraries = await this.getUserLibraries(id, 1, 3, currentUserId);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: isOwnProfile ? user.email : undefined, // 자신의 프로필인 경우만 이메일 포함
        bio: user.bio,
        profileImage: this.ensureFullImageUrl(user.profileImage),
        provider: user.provider,
        createdAt: user.createdAt,
      },
      libraryCount,
      readCount,
      subscribedLibraryCount,
      reviewCount,
      followers: followersCount,
      following: followingCount,
      isEditable: isOwnProfile,
      isFollowing,
      libraries: libraries.items,
    };
  }

  // 사용자 라이브러리 목록 조회
  async getUserLibraries(
    userId: number,
    page: number = 1,
    limit: number = 10,
    currentUserId?: number,
  ): Promise<{ items: LibraryPreviewDto[]; total: number }> {
    // 사용자 존재여부 확인
    await this.findOne(userId);

    // TypeORM QueryBuilder를 사용한 라이브러리 조회
    const libraryRepo = this.userRepository.manager.getRepository(Library);

    const [libraries, total] = await libraryRepo
      .createQueryBuilder('lib')
      .where('lib.ownerId = :userId', { userId })
      .leftJoinAndSelect('lib.owner', 'owner')
      .orderBy('lib.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // 도서 정보 및 구독자 수를 포함한 DTO로 변환
    const libraryDtos: LibraryPreviewDto[] = await Promise.all(
      libraries.map(async (library) => {
        // 라이브러리 책 미리보기 조회 (최대 3권)
        const previewBooks = await this.getLibraryPreviewBooks(library.id);

        // 구독자 수 조회
        const subscriberCount = await this.getLibrarySubscriberCount(
          library.id,
        );

        // 책 수 조회
        const bookCount = await this.getLibraryBookCount(library.id);

        // 태그 정보 조회
        const tagMappingRepo = this.userRepository.manager.getRepository(
          'library_tag_mapping',
        );
        const tagMappings = await tagMappingRepo
          .createQueryBuilder('mapping')
          .innerJoinAndSelect('mapping.libraryTag', 'tag')
          .where('mapping.libraryId = :libraryId', { libraryId: library.id })
          .getMany();

        // 현재 사용자가 이 라이브러리를 구독 중인지 확인
        let isSubscribed = false;
        if (currentUserId) {
          const librarySubscriptionRepo =
            this.userRepository.manager.getRepository('library_subscription');
          const subscription = await librarySubscriptionRepo.findOne({
            where: {
              libraryId: library.id,
              subscriberId: currentUserId,
            },
          });
          isSubscribed = !!subscription;
        }

        // 태그 정보 변환
        const tags = tagMappings.map((mapping) => {
          const tag = mapping.libraryTag;
          return {
            id: mapping.id,
            tagId: tag.id,
            tagName: tag.name,
            usageCount: 10, // 실제 사용 횟수는 추가 쿼리가 필요
            libraryId: library.id,
            note: mapping.note || null,
            createdAt: mapping.createdAt,
            updatedAt: mapping.updatedAt,
          };
        });

        // 소유자 정보
        const owner = {
          id: library.owner.id,
          username: library.owner.username,
          email: library.owner.email,
        };

        return {
          id: library.id,
          name: library.name,
          description: library.description || '',
          isPublic: library.isPublic,
          subscriberCount,
          owner,
          tags,
          bookCount,
          previewBooks,
          isSubscribed,
          createdAt: library.createdAt,
          updatedAt: library.updatedAt,
        };
      }),
    );

    return {
      items: libraryDtos,
      total,
    };
  }

  // 라이브러리 책 미리보기 조회
  private async getLibraryPreviewBooks(libraryId: number): Promise<any[]> {
    // LibraryBook 테이블을 조회하고 책 정보를 가져옴 (최대 3권)
    const libraryBookRepo =
      this.userRepository.manager.getRepository(LibraryBook);

    const libraryBooks = await libraryBookRepo
      .createQueryBuilder('lb')
      .innerJoinAndSelect('lb.book', 'book')
      .where('lb.libraryId = :libraryId', { libraryId })
      .orderBy('lb.createdAt', 'DESC')
      .limit(3)
      .getMany();

    // 책 정보를 DTO 형식으로 변환
    return libraryBooks.map((lb) => {
      const book = lb.book;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        isbn: book.isbn,
        publisher: book.publisher,
      };
    });
  }

  // 라이브러리 구독자 수 조회
  private async getLibrarySubscriberCount(libraryId: number): Promise<number> {
    const librarySubscriptionRepo =
      this.userRepository.manager.getRepository(LibrarySubscription);
    return librarySubscriptionRepo.count({ where: { libraryId } });
  }

  // 라이브러리 책 수 조회
  private async getLibraryBookCount(libraryId: number): Promise<number> {
    const libraryBookRepo =
      this.userRepository.manager.getRepository(LibraryBook);
    return libraryBookRepo.count({ where: { libraryId } });
  }

  // 라이브러리 수 조회
  private async getLibraryCount(userId: number): Promise<number> {
    const libraryRepo = this.userRepository.manager.getRepository(Library);
    return libraryRepo.count({ where: { ownerId: userId } });
  }

  // 리뷰 수 조회
  private async getReviewCount(userId: number): Promise<number> {
    const reviewRepo = this.userRepository.manager.getRepository(Review);
    return reviewRepo.count({ where: { authorId: userId } });
  }

  // 읽은 책 수 조회
  private async getReadCount(userId: number): Promise<number> {
    // ReadingStatus 테이블에서 해당 사용자의 레코드 수를 조회
    const readingStatusRepo =
      this.userRepository.manager.getRepository(ReadingStatus);
    return readingStatusRepo.count({ where: { userId } });
  }

  // 구독 중인 라이브러리 수 조회
  private async getSubscribedLibraryCount(userId: number): Promise<number> {
    // LibrarySubscription 테이블에서 해당 사용자의 구독 수를 조회
    const librarySubscriptionRepo =
      this.userRepository.manager.getRepository(LibrarySubscription);
    return librarySubscriptionRepo.count({ where: { subscriberId: userId } });
  }

  // 팔로우 관련 메서드
  async followUser(followerId: number, followingId: number): Promise<void> {
    // 자기 자신을 팔로우하는 경우 방지
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
    }

    // 팔로우할 사용자가 존재하는지 확인
    const followingUser = await this.findOne(followingId);
    if (!followingUser) {
      throw new NotFoundException('팔로우할 사용자를 찾을 수 없습니다.');
    }

    // 이미 팔로우 중인지 확인
    const existingFollow = await this.userFollowerRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    if (existingFollow) {
      throw new ConflictException('이미 팔로우 중인 사용자입니다.');
    }

    // 새 팔로우 관계 생성
    const newFollow = this.userFollowerRepository.create({
      follower_id: followerId,
      following_id: followingId,
    });

    await this.userFollowerRepository.save(newFollow);
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    // 자기 자신을 언팔로우하는 경우 방지
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 언팔로우할 수 없습니다.');
    }

    const followRelation = await this.userFollowerRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    if (!followRelation) {
      throw new NotFoundException('팔로우 관계를 찾을 수 없습니다.');
    }

    await this.userFollowerRepository.remove(followRelation);
  }

  async getFollowers(
    userId: number,
    page: number = 1,
    limit: number = 10,
    currentUserId?: number,
  ): Promise<FollowersListResponseDto> {
    const user = await this.findOne(userId);

    // 변경된 쿼리: relations 옵션 사용
    const skip = (page - 1) * limit;
    const [followersRelations, total] =
      await this.userFollowerRepository.findAndCount({
        where: { following_id: userId },
        relations: ['follower'],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });

    // 현재 사용자의 팔로우 목록 가져오기 (로그인한 경우)
    let currentUserFollowing: UserFollower[] = [];
    if (currentUserId) {
      currentUserFollowing = await this.userFollowerRepository.find({
        where: { follower_id: currentUserId },
      });
    }

    // DTO 포맷으로 변환
    const followersDTO = followersRelations
      .map((relation) => {
        const follower = relation.follower;
        if (!follower) {
          return null;
        }

        const isFollowing = currentUserId
          ? currentUserFollowing.some((f) => f.following_id === follower.id)
          : false;

        return {
          id: follower.id,
          username: follower.username,
          bio: follower.bio,
          profileImage: this.ensureFullImageUrl(follower.profileImage),
          isFollowing,
        } as FollowerResponseDto;
      })
      .filter((dto) => dto !== null);

    return {
      followers: followersDTO,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
    };
  }

  async getFollowing(
    userId: number,
    page: number = 1,
    limit: number = 10,
    currentUserId?: number,
  ): Promise<FollowingListResponseDto> {
    const user = await this.findOne(userId);

    // 변경된 쿼리: relations 옵션 사용
    const skip = (page - 1) * limit;
    const [followingRelations, total] =
      await this.userFollowerRepository.findAndCount({
        where: { follower_id: userId },
        relations: ['following'],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });

    // 현재 사용자의 팔로우 목록 가져오기 (로그인한 경우)
    let currentUserFollowing: UserFollower[] = [];
    if (currentUserId) {
      currentUserFollowing = await this.userFollowerRepository.find({
        where: { follower_id: currentUserId },
      });
    }

    // DTO 포맷으로 변환
    const followingDTO = followingRelations
      .map((relation) => {
        const followingUser = relation.following;
        if (!followingUser) {
          return null;
        }

        const isFollowing = currentUserId
          ? currentUserFollowing.some(
              (f) => f.following_id === followingUser.id,
            )
          : false;

        return {
          id: followingUser.id,
          username: followingUser.username,
          bio: followingUser.bio,
          profileImage: this.ensureFullImageUrl(followingUser.profileImage),
          isFollowing,
        } as FollowerResponseDto;
      })
      .filter((dto) => dto !== null);

    return {
      following: followingDTO,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
    };
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const follow = await this.userFollowerRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    return !!follow;
  }

  // 사용자의 읽은 책, 읽고 싶은 책, 읽는 중인 책 목록을 조회하는 메서드
  async getUserBooks(
    userId: number,
    status: ReadingStatusType,
    page: number = 1,
    limit: number = 10,
    isOwnProfile: boolean = false,
    currentUserId?: number,
  ): Promise<{ items: ExtendedReadingStatusResponseDto[]; total: number }> {
    try {
      // 사용자 존재 여부 확인
      await this.findOne(userId);

      // Repository 가져오기
      const readingStatusRepo =
        this.userRepository.manager.getRepository(ReadingStatus);
      const bookRepo = this.userRepository.manager.getRepository(Book);

      // 조건 설정
      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      // 페이징 설정
      const skip = (page - 1) * limit;

      // 데이터 조회
      const [statuses, total] = await readingStatusRepo.findAndCount({
        where,
        order: { updatedAt: 'DESC' },
        skip,
        take: limit,
      });

      // 책 정보가 없으면 빈 배열 반환
      if (statuses.length === 0) {
        return { items: [], total };
      }

      // bookId를 이용해 book 정보 별도 조회
      const bookIds = statuses.map((status) => status.bookId);

      // 책 정보 한번에 조회
      const books = await bookRepo.find({
        where: { id: In(bookIds) },
      });

      // bookId를 키로 하는 맵 생성
      const bookMap = new Map<number, Book>();
      books.forEach((book) => {
        bookMap.set(book.id, book);
      });

      // 응답 DTO 생성
      const responseDtos = statuses
        .map((status) => {
          const book = bookMap.get(status.bookId);

          if (!book) {
            return null;
          }

          // 응답 객체 생성
          const bookInfo: ExtendedBookInfoDto = {
            id: book.id,
            title: book.title,
            author: book.author,
            coverImage: book.coverImage,
            isbn: book.isbn,
            publisher: book.publisher,
            isbn13: book.isbn13,
            translator: book.translator,
            pageCount: book.pageCount,
            publishDate: book.publishDate,
            rating: book.rating,
            reviews: book.reviews,
            totalRatings: book.totalRatings,
            description: book.description,
            tags: book.tags,
            categoryId: book.category?.id,
            subcategoryId: book.subcategory?.id,
            priceSales: book.priceSales,
            priceStandard: book.priceStandard,
            isFeatured: book.isFeatured,
            isDiscovered: book.isDiscovered,
          };

          return {
            id: status.id,
            status: status.status,
            currentPage: status.currentPage,
            startDate: status.startDate,
            finishDate: status.finishDate,
            readingMemo: status.readingMemo,
            createdAt: status.createdAt,
            updatedAt: status.updatedAt,
            book: bookInfo,
          } as ExtendedReadingStatusResponseDto;
        })
        .filter((dto) => dto !== null);

      return {
        items: responseDtos,
        total,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 사용자 프로필 정보 업데이트 (이미지 포함)
   */
  async updateUserProfile(
    userId: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    try {
      const user = await this.findOne(userId);

      // 사용자 기본 정보 업데이트
      if (updateUserDto.username) {
        user.username = updateUserDto.username;
      }

      if (updateUserDto.bio !== undefined) {
        user.bio = updateUserDto.bio;
      }

      // removeProfileImage 값 처리 (문자열이나 불리언으로 올 수 있음)
      // FormData에서는 'true'/'false' 문자열로 전송될 수 있음
      let shouldRemoveImage = false;

      // 불리언 또는 문자열 값 처리
      if (typeof updateUserDto.removeProfileImage === 'boolean') {
        shouldRemoveImage = updateUserDto.removeProfileImage;
      } else if (typeof updateUserDto.removeProfileImage === 'string') {
        shouldRemoveImage =
          updateUserDto.removeProfileImage.toLowerCase() === 'true';
      }

      // 프로필 이미지 삭제 요청이 있는 경우
      if (shouldRemoveImage) {
        if (user.profileImage) {
          await this.fileService.deleteFile(user.profileImage);
          user.profileImage = null;
        }
      }
      // 새 파일이 제공된 경우 프로필 이미지 업데이트
      else if (file) {
        // 기존 프로필 이미지가 있으면 삭제
        if (user.profileImage) {
          await this.fileService.deleteFile(user.profileImage);
        }

        // 새 이미지 업로드
        const imageUrl = await this.fileService.uploadImage(file);
        user.profileImage = imageUrl;
      }

      // 사용자 정보 저장
      const savedUser = await this.userRepository.save(user);

      return savedUser;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('프로필 업데이트 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 프로필 이미지 삭제
   */
  async deleteProfileImage(userId: number): Promise<User> {
    const user = await this.findOne(userId);

    if (user.profileImage) {
      await this.fileService.deleteFile(user.profileImage);
      user.profileImage = null;
      return this.userRepository.save(user);
    }

    return user;
  }

  async getCurrentUser(id: number) {
    const user = await this.findOne(id);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profileImage: this.ensureFullImageUrl(user.profileImage),
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      marketingConsent: user.marketingConsent,
      createdAt: user.createdAt,
    };
  }

  /**
   * 특정 사용자가 작성한 리뷰 목록 조회 (페이지네이션)
   */
  async getUserReviews(
    userId: number,
    page: number = 1,
    limit: number = 10,
    type?: string,
    filter: 'popular' | 'recent' = 'recent',
    currentUserId?: number,
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // 사용자 존재 확인
      const user = await this.findOne(userId);

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.author', 'author')
        .leftJoinAndSelect('review.images', 'images')
        .leftJoinAndSelect('review.books', 'reviewBooks')
        .leftJoinAndSelect('reviewBooks.book', 'book')
        .where('review.authorId = :userId', { userId });

      // 타입 필터링
      if (type) {
        queryBuilder.andWhere('review.type = :type', { type });
      }

      // 필터 적용 (인기순 / 최신순)
      switch (filter) {
        case 'popular':
          // 인기순: 좋아요가 많은 순서 + 댓글이 많은 순서
          queryBuilder
            .orderBy('review.likeCount', 'DESC')
            .addOrderBy('review.commentCount', 'DESC')
            .addOrderBy('review.createdAt', 'DESC');
          break;
        case 'recent':
        default:
          // 최신순: 생성일 기준 내림차순
          queryBuilder.orderBy('review.createdAt', 'DESC');
          break;
      }

      // 페이지네이션 적용
      queryBuilder.skip((page - 1) * limit).take(limit);

      // 좋아요 여부 체크
      if (currentUserId) {
        queryBuilder.leftJoin(
          'review.likes',
          'likes',
          'likes.userId = :currentUserId',
          {
            currentUserId,
          },
        );
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'review_isLiked',
        );
      } else {
        queryBuilder.addSelect('false', 'review_isLiked');
      }

      // 쿼리 실행
      const [reviews, total] = await queryBuilder.getManyAndCount();

      // 리뷰에 연결된 책들의 ID 수집
      const bookIds = new Set<number>();
      reviews.forEach((review) => {
        if (review.books && review.books.length > 0) {
          review.books.forEach((reviewBook) => {
            if (reviewBook.book && reviewBook.book.id) {
              bookIds.add(reviewBook.book.id);
            }
          });
        }
      });

      // 책 정보를 미리 로드 (N+1 문제 방지)
      const bookDetailsMap = new Map();
      if (bookIds.size > 0) {
        const books = await this.bookService.findByIds(Array.from(bookIds));
        for (const book of books) {
          const enrichedBook = await this.bookService.enrichBookWithUserData(
            book,
            currentUserId,
          );
          bookDetailsMap.set(book.id, enrichedBook);
        }
      }

      // DTO로 변환
      const reviewDtos = reviews.map((review) => {
        const images = review.images
          ? review.images.map((img) => ({
              id: img.id,
              url: this.ensureFullImageUrl(img.url),
            }))
          : [];

        const books = review.books
          ? review.books.map((reviewBook) => {
              const bookId = reviewBook.book.id;
              const enrichedBook = bookDetailsMap.get(bookId);

              if (enrichedBook) {
                return {
                  id: enrichedBook.id,
                  title: enrichedBook.title,
                  author: enrichedBook.author,
                  coverImage: enrichedBook.coverImage,
                  publisher: enrichedBook.publisher,
                  isbn: enrichedBook.isbn,
                  isbn13: enrichedBook.isbn13,
                  publishDate: enrichedBook.publishDate,
                  description:
                    enrichedBook.description?.substring(0, 100) + '...',
                  rating: enrichedBook.rating,
                  reviews: enrichedBook.reviews,
                  totalRatings: enrichedBook.totalRatings,
                  readingStats: enrichedBook.readingStats,
                  userRating: enrichedBook.userRating,
                  userReadingStatus: enrichedBook.userReadingStatus,
                };
              }

              return {
                id: reviewBook.book.id,
                title: reviewBook.book.title,
                author: reviewBook.book.author,
                coverImage: reviewBook.book.coverImage,
                publisher: reviewBook.book.publisher,
                isbn: reviewBook.book.isbn,
                isbn13: reviewBook.book.isbn13,
              };
            })
          : [];

        return {
          id: review.id,
          content: review.content,
          type: review.type,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          author: {
            id: review.author.id,
            username: review.author.username,
            email: review.author.email,
            profileImage: this.ensureFullImageUrl(review.author.profileImage),
          },
          images,
          books,
          likeCount: review.likeCount || 0,
          commentCount: review.commentCount || 0,
          isLiked: review['isLiked'] || false,
        } as ReviewResponseDto;
      });

      return {
        reviews: reviewDtos,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`사용자 리뷰 조회 중 오류: ${error.message}`);
      throw error;
    }
  }
}
