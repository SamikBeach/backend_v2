import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Review } from '../../review/entities/review.entity';
import { Comment } from '../../review/entities/comment.entity';
import { Library } from '../../library/entities/library.entity';
import { Book } from '../../book/entities/book.entity';

export enum NotificationType {
  COMMENT = 'comment', // 댓글 알림
  LIBRARY_UPDATE = 'library_update', // 구독 중인 서재 업데이트
  LIKE = 'like', // 좋아요 알림
  FOLLOW = 'follow', // 팔로우 알림
  LIBRARY_SUBSCRIBE = 'library_subscribe', // 서재 구독 알림
  COMMENT_LIKE = 'comment_like', // 댓글 좋아요 알림
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

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  action: string; // 어떤 액션이 수행되었는지 (예: 'comment_added', 'library_updated')

  // 액션을 취한 사용자 정보
  @Column({ nullable: true })
  actorId: number; // 액션을 취한 사용자 ID (예: 댓글을 단 사용자)

  @ManyToOne(() => User, { nullable: true })
  actor: User; // 액션을 취한 사용자

  // 이미지, 링크 정보
  @Column({ nullable: true })
  imageUrl: string; // 옵션: 알림에 표시할 이미지 URL (아바타 등)

  @Column({ nullable: true })
  linkUrl: string; // 알림 클릭 시 이동할 URL 또는 경로

  // 리뷰 관련 필드
  @ManyToOne(() => Review, { nullable: true })
  review: Review;

  @Column({ nullable: true })
  reviewId: number;

  // 댓글 관련 필드
  @ManyToOne(() => Comment, { nullable: true })
  comment: Comment;

  @Column({ nullable: true })
  commentId: number;

  // 서재 관련 필드
  @ManyToOne(() => Library, { nullable: true })
  library: Library;

  @Column({ nullable: true })
  libraryId: number;

  // 책 관련 필드
  @ManyToOne(() => Book, { nullable: true })
  book: Book;

  @Column({ nullable: true })
  bookId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
