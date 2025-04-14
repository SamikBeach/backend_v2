import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Book } from '../../book/entities/book.entity';

export enum ReadingStatusType {
  WANT_TO_READ = 'WANT_TO_READ',
  READING = 'READING',
  READ = 'READ',
}

@Entity()
@Unique(['userId', 'bookId'])
export class ReadingStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  bookId: number;

  @Column({
    type: 'enum',
    enum: ReadingStatusType,
    default: ReadingStatusType.WANT_TO_READ,
  })
  status: ReadingStatusType;

  @Column({ type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', nullable: true })
  finishDate: Date | null;

  @Column({ type: 'int', nullable: true })
  currentPage: number | null;

  @Column({ type: 'text', nullable: true })
  readingMemo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book)
  @JoinColumn({ name: 'bookId' })
  book: Book;
}
 