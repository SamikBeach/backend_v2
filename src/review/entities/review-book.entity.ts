import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Review } from './review.entity';
import { Book } from '../../book/entities/book.entity';

@Entity()
export class ReviewBook {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Review, (review) => review.books, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  reviewId: number;

  @ManyToOne(() => Book)
  book: Book;

  @Column()
  bookId: number;

  @CreateDateColumn()
  createdAt: Date;
}
