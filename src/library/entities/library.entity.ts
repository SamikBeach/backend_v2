import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { LibraryBook } from './library-book.entity';
import { LibrarySubscription } from './library-subscription.entity';
import { LibraryUpdateHistory } from './library-update-history.entity';
import { LibraryTagMapping } from './library-tag-mapping.entity';

@Entity()
export class Library {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: 0 })
  subscriberCount: number;

  @ManyToOne(() => User, (user) => user.libraries)
  owner: User;

  @Column()
  ownerId: number;

  @OneToMany(() => LibraryBook, (libraryBook) => libraryBook.library)
  libraryBooks: LibraryBook[];

  @OneToMany(() => LibraryTagMapping, (tagMapping) => tagMapping.library)
  libraryTagMappings: LibraryTagMapping[];

  @OneToMany(
    () => LibrarySubscription,
    (librarySubscription) => librarySubscription.library,
  )
  subscriptions: LibrarySubscription[];

  @OneToMany(
    () => LibraryUpdateHistory,
    (updateHistory) => updateHistory.library,
  )
  updateHistory: LibraryUpdateHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
