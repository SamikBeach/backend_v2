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

  /**
   * 책 ID (외래키가 아님) - 알라딘 API 또는 다른 소스에서 얻은 ID
   * Book 테이블에 실제로 저장되지 않을 수 있음
   */
  @Column({ nullable: true })
  bookId: number;

  /**
   * 책 제목 - DB에 직접 저장
   */
  @Column({ nullable: true })
  title: string;

  /**
   * 책 저자 - DB에 직접 저장
   */
  @Column({ nullable: true })
  author: string;

  /**
   * 책 표지 이미지 URL - DB에 직접 저장
   */
  @Column({ nullable: true })
  coverImage: string;

  /**
   * 출판사 정보 - DB에 직접 저장
   */
  @Column({ nullable: true })
  publisher: string;

  /**
   * ISBN - DB에 직접 저장
   */
  @Column({ nullable: true })
  isbn: string;

  /**
   * ISBN13 - DB에 직접 저장
   */
  @Column({ nullable: true })
  isbn13: string;

  /**
   * 책 설명 - DB에 직접 저장
   */
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

  /**
   * 책 ID (외래키가 아님) - 알라딘 API 또는 다른 소스에서 얻은 ID
   * Book 테이블에 실제로 저장되지 않을 수 있음
   */
  @Column({ nullable: true })
  bookId: number;

  /**
   * 책 제목 - DB에 직접 저장
   */
  @Column({ nullable: true })
  title: string;

  /**
   * 책 저자 - DB에 직접 저장
   */
  @Column({ nullable: true })
  author: string;

  /**
   * 책 표지 이미지 URL - DB에 직접 저장
   */
  @Column({ nullable: true })
  coverImage: string;

  /**
   * 출판사 정보 - DB에 직접 저장
   */
  @Column({ nullable: true })
  publisher: string;

  /**
   * ISBN - DB에 직접 저장
   */
  @Column({ nullable: true })
  isbn: string;

  /**
   * ISBN13 - DB에 직접 저장
   */
  @Column({ nullable: true })
  isbn13: string;

  /**
   * 책 설명 - DB에 직접 저장
   */
  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
