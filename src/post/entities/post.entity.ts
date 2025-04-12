import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { PostImage } from './post-image.entity';
import { PostBook } from './post-book.entity';
import { PostLike } from './post-like.entity';
import { Comment } from './comment.entity';

export type PostType =
  | 'general'
  | 'discussion'
  | 'review'
  | 'question'
  | 'meetup';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: ['general', 'discussion', 'review', 'question', 'meetup'],
    default: 'general',
  })
  type: PostType;

  @ManyToOne(() => User, (user) => user.posts)
  author: User;

  @Column()
  authorId: number;

  @OneToMany(() => PostImage, (image) => image.post, { cascade: true })
  images: PostImage[];

  @OneToMany(() => PostBook, (book) => book.post, { cascade: true })
  books: PostBook[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
