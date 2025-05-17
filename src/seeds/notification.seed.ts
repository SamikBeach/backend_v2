// notification.seed.ts

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { NotificationService } from '../notification/notification.service';
import {
  Notification,
  NotificationType,
} from '../notification/entities/notification.entity';
import { UserService } from '../user/user.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);
  const userService = app.get(UserService);
  const logger = new Logger('NotificationSeed');

  // 데이터 존재 여부 확인을 위한 레포지토리 가져오기
  const notificationRepository = app.get<Repository<Notification>>(
    getRepositoryToken(Notification),
  );

  // 기존 알림 데이터 확인
  const existingNotifications = await notificationRepository.count();
  if (existingNotifications > 0) {
    logger.log(
      `이미 ${existingNotifications}개의 알림이 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  try {
    logger.log('알림 데이터 시드 작업 시작...');

    // 테스트 사용자 가져오기 (이미 seed:user로 생성된 사용자들)
    const userIds = [1, 2, 3]; // 기본 시드 사용자 ID
    const users = [];

    for (const id of userIds) {
      try {
        const user = await userService.findOne(id);
        users.push(user);
      } catch {
        logger.error(`사용자 ID ${id}를 찾을 수 없습니다.`);
      }
    }

    if (users.length === 0) {
      logger.error(
        '사용자 데이터가 없습니다. 사용자 시드를 먼저 실행해주세요.',
      );
      await app.close();
      return;
    }

    logger.log(`${users.length}명의 사용자를 찾았습니다.`);

    // 시스템 알림 생성 (모든 사용자에게 동일한 내용)
    for (const user of users) {
      // 알림 1: 가입 환영 메시지
      await notificationService.create({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: '미역서점에 오신 것을 환영합니다!',
        content:
          '미역서점에서 다양한 고전 도서를 발견하고 서재를 관리해보세요.',
        action: 'system_welcome',
        linkUrl: '/discover',
      });

      await notificationService.create({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: '서비스 업데이트 안내',
        content:
          '새로운 기능이 추가되었습니다. 이제 더 많은 도서를 검색하고 저장할 수 있습니다.',
        action: 'system_update',
        linkUrl: '/home',
      });
    }

    // 댓글 알림 생성 (사용자 간 상호작용)
    for (let i = 0; i < users.length; i++) {
      const commenter = users[i];
      const postAuthor = users[(i + 1) % users.length]; // 다음 사용자에게 알림

      await notificationService.create({
        userId: postAuthor.id,
        type: NotificationType.COMMENT,
        title: '새 댓글',
        content: `${commenter.username || commenter.email}님이 당신의 리뷰에 댓글을 남겼습니다.`,
        reviewId: i + 1, // 가상의 게시물 ID
        action: 'comment_added',
        actorId: commenter.id,
        linkUrl: `/review/${i + 1}`,
      });
    }

    // 좋아요 알림 생성
    for (let i = 0; i < users.length; i++) {
      const liker = users[i];
      const postAuthor = users[(i + 2) % users.length]; // 다른 사용자에게 알림

      await notificationService.create({
        userId: postAuthor.id,
        type: NotificationType.LIKE,
        title: '새 좋아요',
        content: `${liker.username || liker.email}님이 당신의 독서 목록을 좋아합니다.`,
        reviewId: i + 5, // 가상의 게시물 ID
        action: 'review_liked',
        actorId: liker.id,
        linkUrl: `/review/${i + 5}`,
      });
    }

    // 팔로우 알림 생성
    for (let i = 0; i < users.length; i++) {
      const follower = users[i];
      const followed = users[(i + 1) % users.length]; // 다음 사용자를 팔로우

      await notificationService.create({
        userId: followed.id,
        type: NotificationType.FOLLOW,
        title: '새 팔로워',
        content: `${follower.username || follower.email}님이 당신을
        팔로우합니다.`,
        action: 'user_followed',
        actorId: follower.id,
        linkUrl: `/profile/${follower.id}`,
      });
    }

    // 서재 업데이트 알림 생성
    for (let i = 0; i < users.length; i++) {
      const libraryOwner = users[i];
      const subscriber = users[(i + 1) % users.length]; // 다음 사용자가 구독자

      const libraryId = i + 1; // 가상의 서재 ID
      const bookId = i + 10; // 가상의 책 ID
      const libraryName = `${libraryOwner.username || libraryOwner.email}의 서재`;
      const bookTitle = `미역책 ${i + 1}`;

      await notificationService.create({
        userId: subscriber.id,
        type: NotificationType.LIBRARY_UPDATE,
        title: '서재 업데이트',
        content: `구독 중인 서재 [${libraryName}]에 새 책이 추가되었습니다: ${bookTitle}`,
        libraryId,
        bookId,
        action: 'library_updated',
        linkUrl: `/library/${libraryId}`,
      });
    }

    // 일부 알림은 읽음 상태로 변경
    for (const user of users) {
      const notifications = await notificationRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'ASC' },
        take: 2, // 각 사용자의 처음 2개 알림
      });

      for (const notification of notifications) {
        notification.isRead = true;
        await notificationRepository.save(notification);
      }
    }

    // 알림 개수 확인
    const notificationCount = await notificationRepository.count();
    logger.log(`총 ${notificationCount}개의 알림이 생성되었습니다.`);

    logger.log('알림 데이터 시드 작업 완료!');
  } catch (error) {
    logger.error(`알림 시드 작업 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('시드 작업 중 오류가 발생했습니다:', err);
  process.exit(1);
});
