import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_follower')
export class UserFollower {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  follower_id: number;

  @Column()
  following_id: number;

  @ManyToOne(() => User, (user) => user.following)
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @ManyToOne(() => User, (user) => user.followers)
  @JoinColumn({ name: 'following_id' })
  following: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
