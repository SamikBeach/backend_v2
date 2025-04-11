import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 검색어 로그 엔티티
 * 사용자별 검색 기록과 인기 검색어 집계에 사용
 */
@Entity('search_log')
@Index(['term', 'createdAt'])
export class SearchLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  term: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @Column({ nullable: true })
  bookId: number;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * 인기 검색어 엔티티
 * 집계된 인기 검색어를 저장
 */
@Entity('popular_search')
export class PopularSearch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  term: string;

  @Column({ default: 0 })
  count: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * 최근 검색어 엔티티
 * 사용자별 최근 검색어를 저장
 */
@Entity('recent_search')
@Index(['userId', 'createdAt'])
export class RecentSearch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column()
  term: string;

  @Column({ nullable: true })
  bookId: number;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
