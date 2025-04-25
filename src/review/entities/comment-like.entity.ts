import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Unique(['commentId', 'userId']) // 한 사용자는 댓글에 한 번만 좋아요 가능
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Comment, (comment) => comment.likes, { onDelete: 'CASCADE' })
  comment: Comment;

  @Column()
  commentId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
