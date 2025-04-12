import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { Book } from '../../book/entities/book.entity';

@Entity()
export class PostBook {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, (post) => post.books, { onDelete: 'CASCADE' })
  post: Post;

  @Column()
  postId: number;

  @ManyToOne(() => Book)
  book: Book;

  @Column()
  bookId: number;

  @CreateDateColumn()
  createdAt: Date;
}
