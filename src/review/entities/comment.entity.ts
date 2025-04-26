import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Review } from './review.entity';
import { User } from '../../user/entities/user.entity';
import { CommentLike } from './comment-like.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @ManyToOne(() => Review, (review) => review.comments, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  reviewId: number;

  @ManyToOne(() => User)
  author: User;

  @Column()
  authorId: number;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  parentComment: Comment;

  @Column({ nullable: true })
  parentCommentId: number;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];

  @OneToMany(() => CommentLike, (commentLike) => commentLike.comment)
  likes: CommentLike[];

  @Column({ default: 0 })
  likeCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
