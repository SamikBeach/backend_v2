import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
  COMMENT = 'comment', // 댓글 알림
  LIBRARY_UPDATE = 'library_update', // 구독 중인 서재 업데이트
  LIKE = 'like', // 좋아요 알림
  FOLLOW = 'follow', // 팔로우 알림
  SYSTEM = 'system', // 시스템 알림
}

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  sourceId: number; // 알림의 출처 ID (예: 댓글 ID, 서재 ID 등)

  @Column({ nullable: true })
  sourceType: string; // 알림의 출처 타입 (예: 'review', 'library', 'user' 등)

  @Column({ nullable: true })
  actorId: number; // 액션을 취한 사용자 ID (예: 댓글을 단 사용자)

  @Column({ nullable: true })
  imageUrl: string; // 옵션: 알림에 표시할 이미지 URL (아바타 등)

  @Column({ nullable: true })
  linkUrl: string; // 알림 클릭 시 이동할 URL 또는 경로

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
