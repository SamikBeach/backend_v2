import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  NotificationResponseDto,
  NotificationPaginationResponseDto,
  UserInfoDto,
  ReviewInfoDto,
  CommentInfoDto,
  LibraryInfoDto,
  BookInfoDto,
} from './dto/notification-response.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  /**
   * 알림 생성
   */
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      // 알림 엔티티 생성
      const notification = this.notificationRepository.create(
        createNotificationDto,
      );

      // 알림 저장
      const savedNotification =
        await this.notificationRepository.save(notification);
      this.logger.log(
        `사용자 ${createNotificationDto.userId}에게 새 알림 생성됨: ${savedNotification.id}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(`알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 사용자별 모든 알림 조회
   */
  async findAllForUser(userId: number): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: [
        'user',
        'actor',
        'review',
        'review.author',
        'review.books',
        'review.books.book',
        'comment',
        'comment.author',
        'comment.review',
        'comment.parentComment',
        'library',
        'library.owner',
        'book',
      ],
    });

    return Promise.all(
      notifications.map((notification) => this.mapToResponseDto(notification)),
    );
  }

  /**
   * 사용자별 페이지네이션된 알림 조회
   */
  async findAllForUserPaginated(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<NotificationPaginationResponseDto> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        relations: [
          'user',
          'actor',
          'review',
          'review.author',
          'review.books',
          'review.books.book',
          'comment',
          'comment.author',
          'comment.review',
          'comment.parentComment',
          'library',
          'library.owner',
          'book',
        ],
      });

    const notificationDtos = await Promise.all(
      notifications.map((notification) => this.mapToResponseDto(notification)),
    );

    return {
      notifications: notificationDtos,
      total,
      page,
      limit,
    };
  }

  /**
   * 사용자의 읽지 않은 알림 수 조회
   */
  async countUnreadForUser(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 알림 상세 조회
   */
  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: [
        'user',
        'actor',
        'review',
        'review.author',
        'review.books',
        'review.books.book',
        'comment',
        'comment.author',
        'comment.review',
        'comment.parentComment',
        'library',
        'library.owner',
        'book',
      ],
    });

    if (!notification) {
      throw new NotFoundException(`알림 ID ${id}를 찾을 수 없습니다.`);
    }

    return notification;
  }

  /**
   * 알림 DTO 형태로 조회
   */
  async findOneDto(id: number): Promise<NotificationResponseDto> {
    const notification = await this.findOne(id);
    return this.mapToResponseDto(notification);
  }

  /**
   * 알림 업데이트
   */
  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationResponseDto> {
    await this.notificationRepository.update(id, updateNotificationDto);
    const updatedNotification = await this.findOne(id);
    return this.mapToResponseDto(updatedNotification);
  }

  /**
   * 사용자의 모든 알림을 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    this.logger.log(`사용자 ${userId}의 모든 알림이 읽음 처리됨`);
  }

  /**
   * 알림 삭제
   */
  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
    this.logger.log(`알림 ID ${id} 삭제됨`);
  }

  /**
   * 사용자의 모든 알림 삭제
   */
  async removeAllForUser(userId: number): Promise<void> {
    const notifications = await this.notificationRepository.find({
      where: { userId },
    });
    await this.notificationRepository.remove(notifications);
    this.logger.log(`사용자 ${userId}의 모든 알림 삭제됨`);
  }

  /**
   * 댓글 알림 생성
   */
  async createCommentNotification(
    reviewId: number,
    reviewAuthorId: number,
    commenterId: number,
    commenterName: string,
    commentId: number,
    commentContent: string,
  ): Promise<Notification> {
    try {
      // 리뷰 작성자에게만 알림 생성
      if (reviewAuthorId === commenterId) {
        this.logger.log(
          '리뷰 작성자와 댓글 작성자가 동일하여 알림을 생성하지 않습니다.',
        );
        return null;
      }

      const notification = await this.create({
        userId: reviewAuthorId,
        type: NotificationType.COMMENT,
        title: '새 댓글 알림',
        content: `${commenterName}님이 회원님의 게시글에 댓글을 남겼습니다: "${commentContent.substring(0, 50)}${
          commentContent.length > 50 ? '...' : ''
        }"`,
        actorId: commenterId,
        reviewId,
        commentId,
        action: 'comment_added',
        linkUrl: `/review/${reviewId}?comment=${commentId}`,
      });

      this.logger.log(
        `댓글 알림이 생성됨 - 리뷰: ${reviewId}, 댓글: ${commentId}, 수신자: ${reviewAuthorId}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`댓글 알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 좋아요 알림 생성
   */
  async createLikeNotification(
    reviewId: number,
    reviewAuthorId: number,
    likerId: number,
    likerName: string,
  ): Promise<Notification> {
    try {
      // 리뷰 작성자에게만 알림 생성
      if (reviewAuthorId === likerId) {
        this.logger.log(
          '리뷰 작성자와 좋아요를 누른 사용자가 동일하여 알림을 생성하지 않습니다.',
        );
        return null;
      }

      const notification = await this.create({
        userId: reviewAuthorId,
        type: NotificationType.LIKE,
        title: '좋아요 알림',
        content: `${likerName}님이 회원님의 게시글을 좋아합니다.`,
        actorId: likerId,
        reviewId,
        action: 'review_liked',
        linkUrl: `/review/${reviewId}`,
      });

      this.logger.log(
        `좋아요 알림이 생성됨 - 리뷰: ${reviewId}, 좋아요를 누른 사용자: ${likerId}, 수신자: ${reviewAuthorId}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`좋아요 알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 서재 구독 알림 생성
   */
  async createLibrarySubscribeNotification(
    subscriberId: number,
    subscriberName: string,
    libraryOwnerId: number,
    libraryId: number,
    libraryName: string,
  ): Promise<Notification> {
    try {
      // 서재 소유자와 구독자가 동일하면 알림을 보내지 않음
      if (libraryOwnerId === subscriberId) {
        this.logger.log(
          '서재 소유자와 구독자가 동일하여 알림을 생성하지 않습니다.',
        );
        return null;
      }

      const notification = await this.create({
        userId: libraryOwnerId,
        type: NotificationType.LIBRARY_SUBSCRIBE,
        title: '서재 구독 알림',
        content: `${subscriberName}님이 회원님의 '${libraryName}' 서재를 구독하기 시작했습니다.`,
        actorId: subscriberId,
        libraryId,
        action: 'library_subscribed',
        linkUrl: `/library/${libraryId}`,
      });

      this.logger.log(
        `서재 구독 알림이 생성됨 - 구독자: ${subscriberId}, 서재: ${libraryId}, 소유자: ${libraryOwnerId}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`서재 구독 알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 댓글 좋아요 알림 생성
   */
  async createCommentLikeNotification(
    reviewId: number,
    commentId: number,
    commentAuthorId: number,
    likerId: number,
    likerName: string,
  ): Promise<Notification> {
    try {
      // 자신의 댓글에 좋아요를 누른 경우 알림 생성하지 않음
      if (commentAuthorId === likerId) {
        this.logger.log(
          '댓글 작성자와 좋아요를 누른 사용자가 동일하여 알림을 생성하지 않습니다.',
        );
        return null;
      }

      const notification = await this.create({
        userId: commentAuthorId,
        type: NotificationType.COMMENT_LIKE,
        title: '댓글 좋아요 알림',
        content: `${likerName}님이 회원님의 댓글을 좋아합니다.`,
        actorId: likerId,
        reviewId,
        commentId,
        action: 'comment_liked',
        linkUrl: `/review/${reviewId}?comment=${commentId}`,
      });

      this.logger.log(
        `댓글 좋아요 알림이 생성됨 - 댓글: ${commentId}, 좋아요를 누른 사용자: ${likerId}, 수신자: ${commentAuthorId}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`댓글 좋아요 알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 팔로우 알림 생성
   */
  async createFollowNotification(
    followerId: number,
    followedId: number,
    followerName: string,
  ): Promise<Notification> {
    try {
      const notification = await this.create({
        userId: followedId,
        type: NotificationType.FOLLOW,
        title: '새 팔로워 알림',
        content: `${followerName}님이 회원님을 팔로우하기 시작했습니다.`,
        actorId: followerId,
        action: 'user_followed',
        linkUrl: `/profile/${followerId}`,
      });

      this.logger.log(
        `팔로우 알림이 생성됨 - 팔로워: ${followerId}, 팔로우된 사용자: ${followedId}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`팔로우 알림 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 서재 업데이트 알림 생성
   */
  async createLibraryUpdateNotification(
    libraryId: number,
    libraryName: string,
    bookId: number,
    bookTitle: string,
    subscriberIds: number[],
    libraryOwnerId: number,
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const subscriberId of subscriberIds) {
      try {
        const notification = await this.create({
          userId: subscriberId,
          type: NotificationType.LIBRARY_UPDATE,
          title: '서재 업데이트',
          content: `${libraryName} 서재에 새 책 '${bookTitle}'이(가) 추가되었습니다.`,
          libraryId,
          bookId,
          actorId: libraryOwnerId,
          action: 'library_updated',
          linkUrl: `/library/${libraryId}`,
        });

        notifications.push(notification);
      } catch (error) {
        this.logger.error(
          `구독자 ${subscriberId}에게 서재 업데이트 알림 생성 실패: ${error.message}`,
        );
      }
    }

    return notifications;
  }

  /**
   * 시스템 알림 생성
   */
  async createSystemNotification(
    userIds: number[],
    title: string,
    content: string,
    linkUrl?: string,
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      try {
        const notification = await this.create({
          userId,
          type: NotificationType.SYSTEM,
          title,
          content,
          action: 'system_notification',
          linkUrl,
        });

        notifications.push(notification);
      } catch (error) {
        this.logger.error(
          `사용자 ${userId}에게 시스템 알림 생성 실패: ${error.message}`,
        );
      }
    }

    return notifications;
  }

  /**
   * 사용자 정보를 UserInfoDto로 매핑
   */
  private mapUserToDto(user: any): UserInfoDto | undefined {
    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      profileImage: user.profileImage,
      email: user.email,
      bio: user.bio,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
    };
  }

  /**
   * 도서 정보를 BookInfoDto로 매핑
   */
  private mapBookToDto(book: any): BookInfoDto {
    if (!book) return undefined;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      coverImage: book.coverImage,
      isbn: book.isbn,
      publisher: book.publisher,
      publishDate: book.publishDate,
      description: book.description,
      pageCount: book.pageCount,
    };
  }

  /**
   * 알림 엔티티를 DTO로 변환
   */
  private async mapToResponseDto(
    notification: Notification,
  ): Promise<NotificationResponseDto> {
    const dto: NotificationResponseDto = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      isRead: notification.isRead,
      action: notification.action,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      imageUrl: notification.imageUrl,
      linkUrl: notification.linkUrl,
    };

    // 사용자 정보
    if (notification.user) {
      dto.user = this.mapUserToDto(notification.user);
    }

    // 액터 정보
    if (notification.actor) {
      dto.actor = this.mapUserToDto(notification.actor);
    }

    // 리뷰 정보
    if (notification.review) {
      const reviewContent = notification.review.content || '';
      dto.review = {
        id: notification.review.id,
        content: reviewContent,
        type: notification.review.type,
        likeCount: notification.review.likeCount,
        commentCount: notification.review.commentCount,
        createdAt: notification.review.createdAt,
        updatedAt: notification.review.updatedAt,
        author: notification.review.author
          ? this.mapUserToDto(notification.review.author)
          : undefined,
      };

      // 리뷰 관련 책 정보
      if (notification.review.books && notification.review.books.length > 0) {
        dto.review.books = notification.review.books.map((reviewBook) => ({
          id: reviewBook.book.id,
          title: reviewBook.book.title,
          author: reviewBook.book.author,
          coverImage: reviewBook.book.coverImage,
          isbn: reviewBook.book.isbn,
          publisher: reviewBook.book.publisher,
          publishDate: reviewBook.book.publishDate,
          description: reviewBook.book.description,
          pageCount: reviewBook.book.pageCount,
        }));
      }
    }

    // 댓글 정보
    if (notification.comment) {
      dto.comment = {
        id: notification.comment.id,
        content: notification.comment.content,
        createdAt: notification.comment.createdAt,
        updatedAt: notification.comment.updatedAt,
        reviewId: notification.comment.reviewId,
        author: notification.comment.author
          ? this.mapUserToDto(notification.comment.author)
          : undefined,
        parentCommentId: notification.comment.parentCommentId,
        likeCount: notification.comment.likeCount,
      };

      // 댓글이 달린 리뷰 정보 (중첩)
      if (notification.comment.review) {
        dto.comment.review = {
          id: notification.comment.review.id,
          content: notification.comment.review.content,
          type: notification.comment.review.type,
          likeCount: notification.comment.review.likeCount,
          commentCount: notification.comment.review.commentCount,
          createdAt: notification.comment.review.createdAt,
          updatedAt: notification.comment.review.updatedAt,
          author: notification.comment.review.author
            ? this.mapUserToDto(notification.comment.review.author)
            : undefined,
        };
      }

      // 부모 댓글 정보 (중첩)
      if (notification.comment.parentComment) {
        dto.comment.parentComment = {
          id: notification.comment.parentComment.id,
          content: notification.comment.parentComment.content,
          createdAt: notification.comment.parentComment.createdAt,
          reviewId: notification.comment.parentComment.reviewId,
          author: notification.comment.parentComment.author
            ? this.mapUserToDto(notification.comment.parentComment.author)
            : undefined,
          likeCount: notification.comment.parentComment.likeCount,
        };
      }
    }

    // 서재 정보
    if (notification.library) {
      dto.library = {
        id: notification.library.id,
        name: notification.library.name,
        description: notification.library.description,
        isPublic: notification.library.isPublic,
        ownerId: notification.library.ownerId,
        subscriberCount: notification.library.subscriberCount,
        createdAt: notification.library.createdAt,
        updatedAt: notification.library.updatedAt,
        owner: notification.library.owner
          ? this.mapUserToDto(notification.library.owner)
          : undefined,
      };
    }

    // 책 정보
    if (notification.book) {
      dto.book = this.mapBookToDto(notification.book);
    }

    return dto;
  }
}
