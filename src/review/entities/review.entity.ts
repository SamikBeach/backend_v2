import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ReviewImage } from './review-image.entity';
import { ReviewBook } from './review-book.entity';
import { ReviewLike } from './review-like.entity';
import { Comment } from './comment.entity';

export type ReviewType =
  | 'general'
  | 'discussion'
  | 'review'
  | 'question'
  | 'meetup';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: ['general', 'discussion', 'review', 'question', 'meetup'],
    default: 'general',
  })
  type: ReviewType;

  @ManyToOne(() => User, (user) => user.reviews)
  author: User;

  @Column()
  authorId: number;

  @OneToMany(() => ReviewImage, (image) => image.review, { cascade: true })
  images: ReviewImage[];

  @OneToMany(() => ReviewBook, (book) => book.review, { cascade: true })
  books: ReviewBook[];

  @OneToMany(() => ReviewLike, (like) => like.review)
  likes: ReviewLike[];

  @OneToMany(() => Comment, (comment) => comment.review)
  comments: Comment[];

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
