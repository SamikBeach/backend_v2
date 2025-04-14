import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Review } from './review.entity';

@Entity()
export class ReviewImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ nullable: true })
  caption: string;

  @ManyToOne(() => Review, (review) => review.images, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  reviewId: number;

  @CreateDateColumn()
  createdAt: Date;
}
