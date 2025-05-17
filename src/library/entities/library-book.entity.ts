import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Library } from './library.entity';
import { Book } from '../../book/entities/book.entity';

@Entity()
export class LibraryBook {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.libraryBooks)
  library: Library;

  @Column()
  libraryId: number;

  @ManyToOne(() => Book)
  book: Book;

  @Column()
  bookId: number;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
