import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Review } from './review.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Unique(['reviewId', 'userId'])
export class ReviewLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Review, (review) => review.likes, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  reviewId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
