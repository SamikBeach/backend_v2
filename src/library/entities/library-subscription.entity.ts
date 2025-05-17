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
import { User } from '../../user/entities/user.entity';

@Entity()
export class LibrarySubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.subscriptions)
  library: Library;

  @Column()
  libraryId: number;

  @ManyToOne(() => User)
  subscriber: User;

  @Column()
  subscriberId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
