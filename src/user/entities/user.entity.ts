import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Library } from '../../library/entities/library.entity';
import { Review } from '../../review/entities/review.entity';
import { ReadingStatus } from '../../reading-status/entities/reading-status.entity';
import { UserFollower } from './user-follower.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  NAVER = 'naver',
  KAKAO = 'kakao',
  APPLE = 'apple',
}

@Entity('user')
@Index(['provider', 'providerId'], {
  unique: true,
  where: 'provider != \'local\' AND "providerId" IS NOT NULL',
})
@Index(['email'], {
  unique: true,
  where: "provider = 'local' OR provider = 'google'",
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @Column({ nullable: true })
  providerId: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpires: Date;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  marketingConsent: boolean;

  @Column({ nullable: true })
  refreshToken: string;

  @OneToMany(() => Library, (library) => library.owner)
  libraries: Library[];

  @OneToMany(() => Review, (review) => review.author)
  reviews: Review[];

  @OneToMany(() => ReadingStatus, (readingStatus) => readingStatus.user)
  readingStatuses: ReadingStatus[];

  @OneToMany(() => UserFollower, (userFollower) => userFollower.following)
  followers: UserFollower[];

  @OneToMany(() => UserFollower, (userFollower) => userFollower.follower)
  following: UserFollower[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
