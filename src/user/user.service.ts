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
import { Repository, In, FindOptionsWhere } from 'typeorm';
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
  RatingWithBookInfoDto,
  UserActivityItem,
  isReviewActivity,
  isRatingActivity,
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
import { FileService } from '../common/services/file.service';
import { ConfigService } from '@nestjs/config';
import { Book } from '../book/entities/book.entity';
import { ReviewResponseDto } from '../review/dto/review-response.dto';
import { ReviewImage } from '../review/entities/review-image.entity';
import { ReviewBook } from '../review/entities/review-book.entity';
import { BookService } from '../book/book.service';
import { RatingService } from '../rating/rating.service';
import { ReviewLike } from '../review/entities/review-like.entity';
import { LibraryListResponseDto } from '../library/dto/library-response.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class UserService {
  private serverUrl: string;
  private readonly logger = new Logger(UserService.name);

  // 상수 정의: ReviewType 값
  private readonly REVIEW_TYPES = {
    GENERAL: 'general' as const,
    DISCUSSION: 'discussion' as const,
    REVIEW: 'review' as const,
    QUESTION: 'question' as const,
    MEETUP: 'meetup' as const,
  };

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
    @InjectRepository(LibrarySubscription)
    private librarySubscriptionRepository: Repository<LibrarySubscription>,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    @Inject(forwardRef(() => ReadingStatusService))
    private readingStatusService: ReadingStatusService,
    @Inject(forwardRef(() => BookService))
    private bookService: BookService,
    @Inject(forwardRef(() => RatingService))
    private ratingService: RatingService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService,
    private fileService: FileService,
    private configService: ConfigService,
  ) {
    this.serverUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3005';
  }

  // 이미지 URL이 상대 경로인 경우 전체 URL로 변환하는 유틸리티 메소드
  private ensureFullImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl; // 이미 전체 URL이면 그대로 반환

    // 상대 경로인 경우 서버 URL 추가
    if (imageUrl.startsWith('/uploads/')) {
      return `${this.serverUrl}/api/v2${imageUrl}`;
    } else if (imageUrl.startsWith('uploads/')) {
      return `${this.serverUrl}/api/v2/${imageUrl}`;
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
    this.logger.log(
      `findByProviderId: 검색 중 - providerId=${providerId}, provider=${provider}`,
    );

    const user = await this.userRepository.findOneBy({ providerId, provider });

    if (user) {
      this.logger.log(
        `findByProviderId: 사용자 찾음 - userId=${user.id}, email=${user.email}`,
      );
    } else {
      this.logger.log(`findByProviderId: 사용자를 찾을 수 없음`);
    }

    return user;
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
    try {
      const { email, username, provider, providerId, marketingConsent } =
        createUserDto;

      this.logger.log(
        `소셜 사용자 생성 시작: ${email}, ${provider}, ${providerId}`,
      );

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

      this.logger.log(`사용자 객체 생성됨: ${JSON.stringify(user)}`);

      // DB에 저장
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`사용자가 DB에 저장됨: ${JSON.stringify(savedUser)}`);

      return savedUser;
    } catch (error) {
      this.logger.error(`소셜 사용자 생성 오류: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
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
    if (user.provider !== AuthProvider.GOOGLE) {
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
    return bcrypt.hash(password, 10);
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
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const libraryCount = await this.getLibraryCount(id, currentUserId);
    const readCount = await this.getReadCount(id);
    const subscribedLibraryCount = await this.getSubscribedLibraryCount(id);
    const reviewCounts = await this.getUserReviewTypeCounts(id);
    const averageRating = await this.ratingService.getUserAverageRating(id);
    const ratingCount = await this.getRatingCount(id, currentUserId);

    // 중복 제거된 리뷰와 평점 수 계산
    const reviewAndRatingCount = await this.getReviewAndRatingCount(id);

    // 팔로워, 팔로잉 수 계산
    const followerCount = await this.userFollowerRepository.count({
      where: { following_id: id },
    });
    const followingCount = await this.userFollowerRepository.count({
      where: { follower_id: id },
    });

    // 본인 여부 또는 현재 사용자가 팔로우 중인지 여부 확인
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await this.isFollowing(currentUserId, id);
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: isOwnProfile ? user.email : undefined,
        bio: user.bio,
        profileImage: this.ensureFullImageUrl(user.profileImage),
        provider: user.provider,
        createdAt: user.createdAt,
      },
      libraryCount,
      readCount,
      subscribedLibraryCount,
      reviewCount: reviewCounts,
      averageRating,
      ratingCount,
      reviewAndRatingCount,
      followers: followerCount,
      following: followingCount,
      isEditable: isOwnProfile,
      isFollowing: currentUserId !== id ? isFollowing : undefined,
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

    // 다른 사용자의 라이브러리를 조회하는 경우 공개 라이브러리만 조회
    const isOwnProfile = userId === currentUserId;

    let query = libraryRepo
      .createQueryBuilder('lib')
      .where('lib.ownerId = :userId', { userId })
      .leftJoinAndSelect('lib.owner', 'owner');

    // 본인이 아닌 경우 공개된 라이브러리만 보여줌
    if (!isOwnProfile) {
      query = query.andWhere('lib.isPublic = :isPublic', { isPublic: true });
    }

    const [libraries, total] = await query
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
  private async getLibraryCount(
    userId: number,
    currentUserId?: number,
  ): Promise<number> {
    const libraryRepo = this.userRepository.manager.getRepository(Library);

    // 본인 프로필을 조회하는 경우 모든 서재 카운트, 다른 사람이 조회하는 경우 공개 서재만 카운트
    const isOwnProfile = userId === currentUserId;

    if (!isOwnProfile) {
      return libraryRepo.count({
        where: {
          ownerId: userId,
          isPublic: true,
        },
      });
    }

    return libraryRepo.count({ where: { ownerId: userId } });
  }

  // 리뷰 수 조회
  private async getReviewCount(userId: number): Promise<number> {
    const reviewRepo = this.userRepository.manager.getRepository(Review);
    return reviewRepo.count({ where: { authorId: userId } });
  }

  // 읽은 책 수 조회
  private async getReadCount(userId: number): Promise<number> {
    // ReadingStatus 테이블에서 READ 상태인 책의 수만 조회
    const readingStatusRepo =
      this.userRepository.manager.getRepository(ReadingStatus);
    return readingStatusRepo.count({
      where: {
        userId,
        status: ReadingStatusType.READ,
      },
    });
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

    // 팔로우 알림 생성
    const follower = await this.findOne(followerId);
    if (follower) {
      await this.notificationService.createFollowNotification(
        followerId,
        followingId,
        follower.username || '사용자',
      );
    }
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
    await this.findOne(userId);

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
    await this.findOne(userId);

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

  /**
   * 사용자가 팔로우하는 모든 사용자의 ID 목록 조회
   */
  async findFollowingIds(userId: number): Promise<number[]> {
    try {
      const followingRelations = await this.userFollowerRepository.find({
        where: { follower_id: userId },
        select: ['following_id'],
      });

      return followingRelations.map((relation) => relation.following_id);
    } catch (error) {
      this.logger.error(
        `사용자 ID ${userId}의 팔로잉 목록 조회 중 오류: ${error.message}`,
      );
      return [];
    }
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
    sort: string = 'createdAt-desc',
    timeRange: string = 'all',
  ): Promise<{
    items: ExtendedReadingStatusResponseDto[];
    total: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
  }> {
    try {
      // 사용자 존재 여부 확인
      await this.findOne(userId);

      // Repository 가져오기
      const readingStatusRepo =
        this.userRepository.manager.getRepository(ReadingStatus);

      // 조건 설정
      const where: FindOptionsWhere<ReadingStatus> = { userId };
      if (status) {
        where.status = status;
      }

      // 기본 쿼리 빌더 생성
      let queryBuilder = readingStatusRepo
        .createQueryBuilder('readingStatus')
        .leftJoinAndSelect('readingStatus.book', 'book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.subcategory', 'subcategory')
        .where('readingStatus.userId = :userId', { userId });

      if (status) {
        queryBuilder.andWhere('readingStatus.status = :status', { status });
      }

      // 기간 필터링 적용
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate: Date | null = null;

        if (timeRange === 'today') {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );
        } else if (timeRange === 'week') {
          // 이번 주의 시작일(월요일)을 계산
          const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6, 아니면 현재 요일 - 1
          startDate = new Date(now);
          startDate.setDate(now.getDate() - diff);
          startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
        }

        if (startDate) {
          queryBuilder.andWhere('readingStatus.createdAt >= :startDate', {
            startDate,
          });
        }
      }

      // 서재에 담긴 순 정렬인 경우 특별 처리
      if (sort === 'library-desc') {
        // 먼저 조건에 맞는 모든 readingStatus를 가져옴
        const allReadingStatuses = await queryBuilder.getMany();
        const bookIds = allReadingStatuses.map((rs) => rs.bookId);

        if (bookIds.length === 0) {
          return {
            items: [],
            total: 0,
            page,
            totalPages: 0,
            hasNextPage: false,
          };
        }

        // 서재에 담긴 수 가져오기
        const libraryCountResult = await this.userRepository.manager
          .getRepository(LibraryBook)
          .createQueryBuilder('lb')
          .select('lb.bookId', 'bookId')
          .addSelect('COUNT(lb.id)', 'libraryCount')
          .where('lb.bookId IN (:...bookIds)', { bookIds })
          .groupBy('lb.bookId')
          .orderBy('libraryCount', 'DESC')
          .getRawMany();

        // 서재에 담긴 순으로 정렬된 bookId 배열 생성
        const sortedBookIds = libraryCountResult.map((result) => result.bookId);

        // 서재에 담기지 않은 책들도 추가 (평점 순으로)
        const booksNotInLibrary = bookIds.filter(
          (id) => !sortedBookIds.includes(id),
        );
        if (booksNotInLibrary.length > 0) {
          const additionalBooks = await this.userRepository.manager
            .getRepository(Book)
            .createQueryBuilder('book')
            .where('book.id IN (:...ids)', { ids: booksNotInLibrary })
            .orderBy('book.rating', 'DESC')
            .getMany();

          sortedBookIds.push(...additionalBooks.map((book) => book.id));
        }

        // 페이징 적용
        const total = sortedBookIds.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const pagedBookIds = sortedBookIds.slice(skip, skip + limit);

        // 페이징된 ID에 해당하는 readingStatus 조회
        const pagedReadingStatuses = pagedBookIds
          .map((bookId) =>
            allReadingStatuses.find((rs) => rs.bookId === bookId),
          )
          .filter(Boolean) as ReadingStatus[];

        // book 정보를 별도로 조회
        const books = await this.userRepository.manager
          .getRepository(Book)
          .createQueryBuilder('book')
          .leftJoinAndSelect('book.category', 'category')
          .leftJoinAndSelect('book.subcategory', 'subcategory')
          .where('book.id IN (:...bookIds)', { bookIds: pagedBookIds })
          .getMany();

        // book 정보를 매핑
        const bookMap = new Map(books.map((book) => [book.id, book]));

        // 응답 DTO 생성
        const responseDtos = pagedReadingStatuses
          .map((status) => {
            const book = bookMap.get(status.bookId);

            // book이 null인 경우 처리
            if (!book) {
              this.logger.warn(
                `Book not found for reading status ${status.id}, bookId: ${status.bookId}`,
              );
              return null;
            }

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
              categoryId: book.category?.id || null,
              subcategoryId: book.subcategory?.id || null,
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
          .filter(Boolean) as ExtendedReadingStatusResponseDto[];

        return {
          items: responseDtos,
          total,
          page,
          totalPages,
          hasNextPage: page < totalPages,
        };
      }

      // 일반 정렬의 경우 - 먼저 모든 데이터를 가져온 후 메모리에서 정렬
      const allStatuses = await queryBuilder.getMany();

      if (allStatuses.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          totalPages: 0,
          hasNextPage: false,
        };
      }

      // book 정보를 별도로 조회
      const bookIds = allStatuses.map((status) => status.bookId);
      const books = await this.userRepository.manager
        .getRepository(Book)
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.subcategory', 'subcategory')
        .where('book.id IN (:...bookIds)', { bookIds })
        .getMany();

      // book 정보를 매핑
      const bookMap = new Map(books.map((book) => [book.id, book]));

      // status와 book을 결합한 데이터 생성
      const statusWithBooks = allStatuses
        .map((status) => {
          const book = bookMap.get(status.bookId);
          if (!book) {
            this.logger.warn(
              `Book not found for reading status ${status.id}, bookId: ${status.bookId}`,
            );
            return null;
          }
          return { status, book };
        })
        .filter(Boolean) as { status: ReadingStatus; book: Book }[];

      // 정렬 적용
      switch (sort) {
        case 'rating-desc':
          statusWithBooks.sort(
            (a, b) => (b.book.rating || 0) - (a.book.rating || 0),
          );
          break;
        case 'reviews-desc':
          statusWithBooks.sort(
            (a, b) => (b.book.reviews || 0) - (a.book.reviews || 0),
          );
          break;
        case 'publishDate-desc':
          statusWithBooks.sort((a, b) => {
            const dateA = a.book.publishDate
              ? new Date(a.book.publishDate).getTime()
              : 0;
            const dateB = b.book.publishDate
              ? new Date(b.book.publishDate).getTime()
              : 0;
            return dateB - dateA;
          });
          break;
        case 'title-asc':
          statusWithBooks.sort((a, b) =>
            (a.book.title || '').localeCompare(b.book.title || ''),
          );
          break;
        case 'createdAt-desc':
        default:
          statusWithBooks.sort(
            (a, b) =>
              new Date(b.status.createdAt).getTime() -
              new Date(a.status.createdAt).getTime(),
          );
          break;
      }

      // 페이징 적용
      const total = statusWithBooks.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const pagedStatusWithBooks = statusWithBooks.slice(skip, skip + limit);

      // 응답 DTO 생성
      const responseDtos = pagedStatusWithBooks.map(({ status, book }) => {
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
          categoryId: book.category?.id || null,
          subcategoryId: book.subcategory?.id || null,
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
      });

      return {
        items: responseDtos,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
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
    type?: string[],
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
      await this.findOne(userId);

      this.logger.log(
        `유저 리뷰 조회 - 유저ID: ${userId}, 타입: ${type ? type.join(', ') : '전체'}, 필터: ${filter}`,
      );

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.author', 'author')
        .leftJoinAndSelect('review.images', 'images')
        .leftJoinAndSelect('review.books', 'reviewBooks')
        .leftJoinAndSelect('reviewBooks.book', 'book')
        .where('review.authorId = :userId', { userId });

      // 타입 필터링
      if (type && Array.isArray(type) && type.length > 0) {
        // 유효한 타입 목록
        const validTypes = [
          'general',
          'discussion',
          'review',
          'question',
          'meetup',
        ];

        // 유효한 타입만 필터링
        const filteredTypes = type.filter((t) => validTypes.includes(t));

        if (filteredTypes.length > 0) {
          queryBuilder.andWhere('review.type IN (:...types)', {
            types: filteredTypes,
          });
          this.logger.log(`타입 필터 적용: ${filteredTypes.join(', ')}`);
        }
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
        // 필드명을 review_isLiked로 변경 (TypeORM에서 실제 값을 가져오는 방식에 맞게)
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'review_isLiked',
        );
      } else {
        queryBuilder.addSelect('false', 'review_isLiked');
      }

      // 쿼리 실행
      const [reviews, total] = await queryBuilder.getManyAndCount();

      // 로그 추가 - 리뷰의 isLiked 필드 확인
      if (reviews.length > 0) {
        const rawObject = {};
        // 객체의 모든 키를 확인
        for (const key in reviews[0]) {
          if (typeof key === 'string') {
            rawObject[key] = reviews[0][key];
          }
        }

        this.logger.log(
          `첫 번째 리뷰의 필드 확인: ${JSON.stringify({
            review_id: reviews[0].id,
            review_type: reviews[0].type,
            raw_isLiked: reviews[0]['isLiked'],
            raw_review_isLiked: reviews[0]['review_isLiked'],
          })}`,
        );

        // 좋아요 상태 집계
        if (currentUserId) {
          const likedReviews = reviews.filter(
            (r) => r['review_isLiked'] === true,
          );
          this.logger.log(
            `유저 리뷰 목록 isLiked 상태: 총 ${reviews.length}개 중 좋아요된 리뷰 ${likedReviews.length}개`,
          );
        }
      }

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
            userId,
          );
          bookDetailsMap.set(book.id, enrichedBook);
        }
      }

      // Map reviews data with book information
      const mapReviewsData = async (review: Review) => {
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

        // 리뷰와 관련된 첫 번째 책에 대한 사용자 평점 정보 추출
        let userRating = null;
        if (books.length > 0 && books[0].userRating) {
          userRating = {
            bookId: books[0].id,
            rating: books[0].userRating.rating,
            comment: books[0].userRating.comment,
          };
        }

        // 좋아요 상태 확인 및 로깅 (review 타입인 경우에만)
        let isLiked = review['review_isLiked'] === true;

        // review_isLiked가 undefined인 경우 직접 체크
        if (currentUserId && review['review_isLiked'] === undefined) {
          isLiked = await this.isReviewLikedByUser(review.id, currentUserId);
          this.logger.debug(
            `리뷰 ID=${review.id}, 타입=${review.type} isLiked 직접 체크: ${isLiked}`,
          );
        } else if (currentUserId) {
          this.logger.debug(
            `리뷰 ID=${review.id}, 타입=${review.type} isLiked 설정: ${isLiked}, raw_value=${review['review_isLiked']}`,
          );
        }

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
          userRating,
          likeCount: review.likeCount || 0,
          commentCount: review.commentCount || 0,
          isLiked,
        } as ReviewResponseDto;
      };

      // 매핑 작업 수행
      const mappedReviews = [];
      for (const review of reviews) {
        mappedReviews.push(await mapReviewsData(review));
      }

      return {
        reviews: mappedReviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`사용자 리뷰 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 사용자의 읽기 상태별 책 수 조회
  async getUserReadingStatusCounts(userId: number): Promise<{
    [ReadingStatusType.WANT_TO_READ]: number;
    [ReadingStatusType.READING]: number;
    [ReadingStatusType.READ]: number;
    total: number;
  }> {
    try {
      // 사용자 존재 여부 확인
      await this.findOne(userId);

      // ReadingStatus 테이블 접근
      const readingStatusRepo =
        this.userRepository.manager.getRepository(ReadingStatus);

      // 상태별 카운트 조회
      const [wantToReadCount, readingCount, readCount, totalCount] =
        await Promise.all([
          readingStatusRepo.count({
            where: {
              userId,
              status: ReadingStatusType.WANT_TO_READ,
            },
          }),
          readingStatusRepo.count({
            where: {
              userId,
              status: ReadingStatusType.READING,
            },
          }),
          readingStatusRepo.count({
            where: {
              userId,
              status: ReadingStatusType.READ,
            },
          }),
          readingStatusRepo.count({
            where: { userId },
          }),
        ]);

      return {
        [ReadingStatusType.WANT_TO_READ]: wantToReadCount,
        [ReadingStatusType.READING]: readingCount,
        [ReadingStatusType.READ]: readCount,
        total: totalCount,
      };
    } catch (error) {
      this.logger.error(
        `사용자 읽기 상태별 책 수 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }

  // 사용자의 리뷰 타입별 수 조회
  async getUserReviewTypeCounts(userId: number): Promise<{
    [key: string]: number;
    general: number;
    discussion: number;
    review: number;
    question: number;
    meetup: number;
    total: number;
  }> {
    try {
      // 사용자 존재 여부 확인
      await this.findOne(userId);

      // 전체 리뷰 개수
      const totalCount = await this.reviewRepository.count({
        where: { authorId: userId },
      });

      // 각 타입별 개수 조회
      const [
        generalCount,
        discussionCount,
        reviewCount,
        questionCount,
        meetupCount,
      ] = await Promise.all([
        this.reviewRepository.count({
          where: { authorId: userId, type: this.REVIEW_TYPES.GENERAL },
        }),
        this.reviewRepository.count({
          where: { authorId: userId, type: this.REVIEW_TYPES.DISCUSSION },
        }),
        this.reviewRepository.count({
          where: { authorId: userId, type: this.REVIEW_TYPES.REVIEW },
        }),
        this.reviewRepository.count({
          where: { authorId: userId, type: this.REVIEW_TYPES.QUESTION },
        }),
        this.reviewRepository.count({
          where: { authorId: userId, type: this.REVIEW_TYPES.MEETUP },
        }),
      ]);

      return {
        [this.REVIEW_TYPES.GENERAL]: generalCount,
        [this.REVIEW_TYPES.DISCUSSION]: discussionCount,
        [this.REVIEW_TYPES.REVIEW]: reviewCount,
        [this.REVIEW_TYPES.QUESTION]: questionCount,
        [this.REVIEW_TYPES.MEETUP]: meetupCount,
        total: totalCount,
      };
    } catch (error) {
      this.logger.error(`사용자 리뷰 타입별 수 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  // 별점만 매긴 것들의 개수 조회 (리뷰가 있는 책의 평점 제외)
  private async getRatingCount(
    userId: number,
    currentUserId?: number,
  ): Promise<number> {
    try {
      // 리뷰 조회 - 리뷰 타입의 리뷰만 가져오기
      const reviewsResult = await this.getUserReviews(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 리뷰 가져오기
        ['review'], // review 타입만 필터링
        'recent',
        currentUserId,
      );

      // 리뷰에 포함된 책의 ID 목록 생성
      const reviewBookIds = new Set<number>();
      reviewsResult.reviews.forEach((review) => {
        if (review.books && review.books.length > 0) {
          review.books.forEach((book) => {
            reviewBookIds.add(book.id);
          });
        }
      });

      // 모든 평점 가져오기
      const allRatings =
        await this.ratingService.findAllByUserWithBookInfo(userId);

      // 리뷰가 있는 책에 대한 평점 필터링
      const filteredRatings = allRatings.filter((rating) => {
        return !reviewBookIds.has(rating.book?.id);
      });

      // 필터링된 평점 개수 반환
      return filteredRatings.length;
    } catch (error) {
      this.logger.error(
        `사용자 ID ${userId}의 평점 개수 조회 중 오류: ${error.message}`,
      );
      return 0;
    }
  }

  async getUserRatings(
    userId: number,
    page: number = 1,
    limit: number = 10,
    currentUserId?: number,
  ): Promise<{
    ratings: RatingWithBookInfoDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // 사용자 존재 여부 확인
      const user = await this.findOne(userId);

      // 리뷰 조회 - 리뷰 타입의 리뷰만 가져오기
      const reviewsResult = await this.getUserReviews(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 리뷰 가져오기
        ['review'], // review 타입만 필터링
        'recent',
        currentUserId,
      );

      // 리뷰에 포함된 책의 ID 목록 생성
      const reviewBookIds = new Set<number>();
      reviewsResult.reviews.forEach((review) => {
        if (review.books && review.books.length > 0) {
          review.books.forEach((book) => {
            reviewBookIds.add(book.id);
          });
        }
      });

      // 모든 평점 가져오기
      const allRatings =
        await this.ratingService.findAllByUserWithBookInfo(userId);

      // 리뷰가 있는 책에 대한 평점 필터링
      const filteredRatings = allRatings.filter((rating) => {
        return !reviewBookIds.has(rating.book?.id);
      });

      // 총 평점 수 계산 (필터링 후)
      const total = filteredRatings.length;

      // 페이지네이션을 위한 skip 계산
      const skip = (page - 1) * limit;

      // 페이지네이션 적용
      const ratings = filteredRatings.slice(skip, skip + limit);

      // 책 ID 목록 수집
      const bookIds = ratings
        .filter((rating) => rating.book?.id)
        .map((rating) => rating.book.id);

      // 책 정보를 미리 로드 (N+1 문제 방지)
      const bookDetailsMap = new Map();
      if (bookIds.length > 0) {
        const books = await this.bookService.findByIds(bookIds);
        for (const book of books) {
          const enrichedBook = await this.bookService.enrichBookWithUserData(
            book,
            userId,
          );
          bookDetailsMap.set(book.id, enrichedBook);
        }
      }

      // 사용자 정보와 책 정보를 포함한 평점 데이터 반환
      const ratingsWithUserInfo = await Promise.all(
        ratings.map(async (rating) => {
          const profileImageUrl = this.ensureFullImageUrl(user.profileImage);

          // 향상된 책 정보 가져오기
          let bookInfo = null;
          if (rating.book) {
            const enrichedBook = bookDetailsMap.get(rating.book.id);
            if (enrichedBook) {
              bookInfo = {
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
            } else {
              // 기본 책 정보만 있는 경우 (enrichedBook을 가져오지 못한 경우)
              bookInfo = {
                id: rating.book.id,
                title: rating.book.title,
                author: rating.book.author,
                coverImage: rating.book.coverImage,
                isbn: rating.book.isbn,
                publisher: rating.book.publisher,
              };
            }
          }

          return {
            ...rating,
            user: {
              id: user.id,
              username: user.username || '사용자',
              profileImage: profileImageUrl,
            },
            book: bookInfo,
          };
        }),
      );

      return {
        ratings: ratingsWithUserInfo,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `사용자 ID ${userId}의 평점 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }

  async getUserRatingsByScore(userId: number) {
    try {
      const ratings =
        await this.ratingService.findAllByUserWithBookInfo(userId);

      // 각 평점 점수별 개수 초기화
      const ratingCounts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        total: 0,
      };

      // 평점 점수별로 개수 세기
      ratings.forEach((rating) => {
        if (rating.rating >= 1 && rating.rating <= 5) {
          ratingCounts[rating.rating]++;
          ratingCounts.total++;
        }
      });

      return ratingCounts;
    } catch (error) {
      this.logger.error(
        `Failed to get ratings by score for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  private async isReviewLikedByUser(
    reviewId: number,
    userId?: number,
  ): Promise<boolean> {
    if (!userId) return false;

    const like = await this.userRepository.manager
      .getRepository(ReviewLike)
      .findOne({
        where: { reviewId, userId },
      });

    return !!like;
  }

  async getUserActivity(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filter: 'popular' | 'recent' = 'recent',
    currentUserId?: number,
  ): Promise<{
    activities: UserActivityItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log(
        `getUserActivity 호출: userId=${userId}, currentUserId=${currentUserId}, filter=${filter}`,
      );

      // 리뷰 타입이 'review'인 항목만 가져옵니다
      const reviewsResult = await this.getUserReviews(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 리뷰 가져오기
        ['review'], // 'review' 타입만 포함
        filter,
        currentUserId, // 좋아요 여부 확인을 위해 currentUserId 유지
      );

      // 평점 조회
      const ratingsResult = await this.getUserRatings(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 평점 가져오기
        currentUserId, // 여기서는 currentUserId 유지 (isLiked 관련)
      );

      // 리뷰와 평점을 합치고 타입 필드 추가
      const reviewsWithType = reviewsResult.reviews.map((review) => ({
        ...review,
        activityType: 'review',
      }));

      // 디버그 로그 - 리뷰 결과
      if (reviewsWithType.length > 0) {
        // 리뷰의 isLiked 상태 로깅
        const likedCount = reviewsWithType.filter((r) => r.isLiked).length;

        this.logger.log(
          `Activity - 'review' 타입 리뷰 조회 결과: 총 ${reviewsWithType.length}개, 좋아요 표시된 리뷰: ${likedCount}개`,
        );

        this.logger.log(
          `Activity - 첫 번째 리뷰 isLiked 확인: ${JSON.stringify({
            review_id: reviewsWithType[0].id,
            type: reviewsWithType[0].type,
            isLiked: reviewsWithType[0].isLiked,
            activity_type: reviewsWithType[0].activityType,
          })}`,
        );
      }

      // 이 부분은 필요한 경우에만 실행합니다 (getUserReviews 메서드에서 이미 isLiked 설정 시도함)
      if (reviewsWithType.length > 0 && currentUserId) {
        // 모든 리뷰의 isLiked 상태를 확인하기 위해 누락된 값이 있는지 검사
        const hasAnyUndefinedIsLiked = reviewsWithType.some(
          (review) => review.isLiked === undefined || review.isLiked === null,
        );

        if (hasAnyUndefinedIsLiked) {
          this.logger.log(
            `Activity - 리뷰 타입 활동 중 isLiked가 undefined인 항목이 있어 좋아요 상태 재확인 시작`,
          );

          // 모든 리뷰에 대한 좋아요 데이터를 한 번에 가져오기
          const reviewIds = reviewsWithType.map((review) => review.id);
          const likes = await this.userRepository.manager
            .getRepository(ReviewLike)
            .find({
              where: {
                reviewId: In(reviewIds),
                userId: currentUserId,
              },
            });

          this.logger.log(
            `Activity - 좋아요 데이터 조회 결과: ${likes.length}개`,
          );

          // 좋아요 데이터를 Map으로 변환하여 빠르게 접근할 수 있도록 함
          const likeMap = new Map();
          likes.forEach((like) => {
            likeMap.set(like.reviewId, true);
          });

          // 각 리뷰의 isLiked 값을 설정
          for (const review of reviewsWithType) {
            // isLiked 값을 명시적으로 설정 (기존 값이 있으면 유지)
            if (review.isLiked === undefined || review.isLiked === null) {
              review.isLiked = likeMap.has(review.id);

              // 복구된 좋아요 여부 로깅
              if (likeMap.has(review.id)) {
                this.logger.log(
                  `Activity - isLiked 직접 설정: 리뷰 ID=${review.id}, 타입=${review.type}, isLiked=true`,
                );
              }
            }
          }
        } else {
          this.logger.log(
            `Activity - 모든 리뷰에 이미 isLiked 값이 설정되어 있습니다.`,
          );
        }
      }

      // 리뷰에 포함된 책의 ID 목록 생성
      const reviewBookIds = new Set<number>();
      reviewsWithType.forEach((review) => {
        if (review.books && review.books.length > 0) {
          review.books.forEach((book) => {
            reviewBookIds.add(book.id);
          });
        }
      });

      // 평점에 타입 추가
      const ratingsWithType = ratingsResult.ratings.map((rating) => ({
        ...rating,
        activityType: 'rating',
      }));

      // 리뷰에 포함된 책에 대한 별점 필터링
      const filteredRatings = ratingsWithType.filter((rating) => {
        // 리뷰에 포함된 책에 대한 별점이 아닌 경우만 포함
        return !reviewBookIds.has(rating.book?.id);
      });

      // 활동들을 합치고 정렬
      let allActivities = [...reviewsWithType, ...filteredRatings];

      // 필터에 따라 정렬
      if (filter === 'recent') {
        allActivities.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else if (filter === 'popular') {
        allActivities.sort((a, b) => {
          let aPopularity = 0;
          let bPopularity = 0;

          if (isReviewActivity(a)) {
            aPopularity = a.likeCount;
          } else if (isRatingActivity(a)) {
            aPopularity = a.rating;
          }

          if (isReviewActivity(b)) {
            bPopularity = b.likeCount;
          } else if (isRatingActivity(b)) {
            bPopularity = b.rating;
          }

          return bPopularity - aPopularity;
        });
      }

      // 최종 확인 로그
      if (allActivities.length > 0 && isReviewActivity(allActivities[0])) {
        this.logger.log(
          `Activity - 정렬 후 첫 번째 활동 isLiked 확인: ${JSON.stringify({
            activity_type: allActivities[0].activityType,
            review_id: allActivities[0].id,
            isLiked: allActivities[0].isLiked,
          })}`,
        );
      }

      // 페이지네이션 적용
      const total = allActivities.length;
      const skip = (page - 1) * limit;
      const activities = allActivities.slice(skip, skip + limit);

      return {
        activities,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `사용자 ID ${userId}의 활동 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }

  // 중복 제거된 리뷰와 평점 수 계산
  private async getReviewAndRatingCount(userId: number): Promise<number> {
    try {
      // 리뷰 조회 - 리뷰 타입의 리뷰만 가져오기
      const reviewsResult = await this.getUserReviews(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 리뷰 가져오기
        ['review'], // review 타입만 필터링
        'recent',
        userId, // 수정: currentUserId 대신 userId를 사용하여 프로필 소유자의 평점을 가져옴
      );

      // 평점 조회
      const ratingsResult = await this.getUserRatings(
        userId,
        1,
        1000, // 충분히 큰 숫자로 모든 평점 가져오기
        userId, // 수정: currentUserId 대신 userId를 사용하여 프로필 소유자의 평점을 가져옴
      );

      // 리뷰와 평점을 합치고 타입 필드 추가
      const reviews = reviewsResult.reviews.map((review) => ({
        ...review,
        activityType: 'review',
      }));

      const ratings = ratingsResult.ratings.map((rating) => ({
        ...rating,
        activityType: 'rating',
      }));

      // 리뷰에 포함된 책의 ID 목록 생성
      const reviewBookIds = new Set<number>();
      reviews.forEach((review) => {
        if (review.books && review.books.length > 0) {
          review.books.forEach((book) => {
            reviewBookIds.add(book.id);
          });
        }
      });

      // 리뷰에 포함된 책에 대한 별점 필터링
      const filteredRatings = ratings.filter((rating) => {
        // 리뷰에 포함된 책에 대한 별점이 아닌 경우만 포함
        return !reviewBookIds.has(rating.book?.id);
      });

      // 총 활동 수 (총 리뷰 수 + 필터링된 평점 수)
      return reviews.length + filteredRatings.length;
    } catch (error) {
      this.logger.error(
        `사용자 ID ${userId}의 리뷰 및 평점 수 계산 중 오류: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * 사용자가 구독한 서재 목록을 페이지네이션과 함께 반환합니다.
   * @param userId 사용자 ID
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @param sortOption 정렬 옵션
   * @returns 구독한 서재 목록과 페이지네이션 정보
   */
  async getUserSubscribedLibraries(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    libraries: LibraryListResponseDto[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // 공개 서재 또는 자신이 소유한 서재만 표시하도록 수정
    const queryBuilder = this.librarySubscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.library', 'library')
      .leftJoinAndSelect('library.owner', 'owner')
      .leftJoinAndSelect('library.libraryTagMappings', 'libraryTagMappings')
      .leftJoinAndSelect('libraryTagMappings.libraryTag', 'libraryTag')
      .where('subscription.subscriberId = :userId', { userId })
      .andWhere(
        '(library.isPublic = :isPublic OR library.ownerId = :ownerId)',
        {
          isPublic: true,
          ownerId: userId,
        },
      );

    const [libraries, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    const libraryListResponseDtos = libraries.map((subscription) => {
      const library = subscription.library;
      return {
        id: library.id,
        name: library.name,
        description: library.description,
        isPublic: library.isPublic,
        subscriberCount: library.subscriberCount,
        owner: {
          id: library.owner.id,
          username: library.owner.username,
          email: library.owner.email,
        },
        createdAt: library.createdAt,
        updatedAt: library.updatedAt,
        bookCount: library.libraryBooks?.length || 0,
        previewBooks:
          library.libraryBooks?.slice(0, 3).map((lb) => ({
            id: lb.book.id,
            title: lb.book.title,
            author: lb.book.author,
            coverImage: lb.book.coverImage,
            isbn: lb.book.isbn,
            publisher: lb.book.publisher,
          })) || [],
        tags:
          library.libraryTagMappings?.map((mapping) => ({
            id: mapping.id,
            tagId: mapping.libraryTag.id,
            tagName: mapping.libraryTag.name,
            description: mapping.libraryTag.description,
            usageCount: mapping.libraryTag.usageCount,
            libraryId: library.id,
            note: mapping.note,
            createdAt: mapping.createdAt,
            updatedAt: mapping.updatedAt,
          })) || [],
        isSubscribed: true,
      };
    });

    return {
      libraries: libraryListResponseDtos,
      total,
      currentPage: page,
      totalPages,
    };
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<User> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    user.password = hashedPassword;
    return this.userRepository.save(user);
  }

  // providerId 업데이트 메서드
  async updateProviderInfo(userId: number, providerId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.providerId = providerId;
    return this.userRepository.save(user);
  }

  async updateUserEmail(userId: number, email: string): Promise<User> {
    const user = await this.findOne(userId);
    user.email = email;
    return this.userRepository.save(user);
  }

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    try {
      // 사용자 프로필 이미지는 유지 (복구 가능성을 위해)
      // if (user.profileImage) {
      //   await this.fileService.deleteFile(user.profileImage);
      // }

      // 사용자 계정 soft delete
      await this.userRepository.softRemove(user);

      this.logger.log(
        `사용자 계정 soft delete 완료: ID=${userId}, 이메일=${user.email}`,
      );
    } catch (error) {
      this.logger.error(
        `사용자 계정 삭제 실패: ID=${userId}, 오류=${error.message}`,
      );
      throw new BadRequestException('계정 삭제 중 오류가 발생했습니다.');
    }
  }
}
