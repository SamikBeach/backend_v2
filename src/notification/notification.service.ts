import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
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
  async findAllForUser(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 사용자별 페이지네이션된 알림 조회
   */
  async findAllForUserPaginated(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      notifications,
      total,
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
    });

    if (!notification) {
      throw new NotFoundException(`알림 ID ${id}를 찾을 수 없습니다.`);
    }

    return notification;
  }

  /**
   * 알림 업데이트
   */
  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);
    const updated = { ...notification, ...updateNotificationDto };
    return this.notificationRepository.save(updated);
  }

  /**
   * 사용자의 모든 알림을 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    this.logger.log(`사용자 ${userId}의 모든 알림을 읽음 처리했습니다.`);
  }

  /**
   * 알림 삭제
   */
  async remove(id: number): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`알림 ID ${id}를 찾을 수 없습니다.`);
    }
    this.logger.log(`알림 ID ${id} 삭제됨`);
  }

  /**
   * 사용자별 알림 전체 삭제
   */
  async removeAllForUser(userId: number): Promise<void> {
    await this.notificationRepository.delete({ userId });
    this.logger.log(`사용자 ${userId}의 모든 알림이 삭제되었습니다.`);
  }

  /**
   * 댓글 알림 생성
   */
  async createCommentNotification(
    reviewId: number,
    reviewAuthorId: number,
    commenterId: number,
    commenterName: string,
  ): Promise<Notification> {
    // 자신의 리뷰에 자신이 댓글을 달면 알림 생성 안함
    if (reviewAuthorId === commenterId) {
      return null;
    }

    return this.create({
      userId: reviewAuthorId,
      type: NotificationType.COMMENT,
      title: '새 댓글',
      content: `${commenterName}님이 당신의 리뷰에 댓글을 남겼습니다.`,
      sourceId: reviewId,
      sourceType: 'review',
      actorId: commenterId,
      linkUrl: `/review/${reviewId}`,
    });
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
    // 자신의 리뷰에 자신이 좋아요를 누르면 알림 생성 안함
    if (reviewAuthorId === likerId) {
      return null;
    }

    return this.create({
      userId: reviewAuthorId,
      type: NotificationType.LIKE,
      title: '새 좋아요',
      content: `${likerName}님이 당신의 독서 목록을 좋아합니다.`,
      sourceId: reviewId,
      sourceType: 'review',
      actorId: likerId,
      linkUrl: `/review/${reviewId}`,
    });
  }

  /**
   * 팔로우 알림 생성
   */
  async createFollowNotification(
    followerId: number,
    followedId: number,
    followerName: string,
  ): Promise<Notification> {
    return this.create({
      userId: followedId,
      type: NotificationType.FOLLOW,
      title: '새 팔로워',
      content: `${followerName}님이 당신을 팔로우합니다.`,
      sourceId: followerId,
      sourceType: 'user',
      actorId: followerId,
      linkUrl: `/profile/${followerId}`,
    });
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
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const subscriberId of subscriberIds) {
      const notification = await this.create({
        userId: subscriberId,
        type: NotificationType.LIBRARY_UPDATE,
        title: '서재 업데이트',
        content: `구독 중인 서재 [${libraryName}]에 새 책이 추가되었습니다.`,
        sourceId: libraryId,
        sourceType: 'library',
        linkUrl: `/library/${libraryId}`,
      });
      notifications.push(notification);
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
      const notification = await this.create({
        userId,
        type: NotificationType.SYSTEM,
        title,
        content,
        sourceType: 'system',
        linkUrl,
      });
      notifications.push(notification);
    }

    return notifications;
  }
}
