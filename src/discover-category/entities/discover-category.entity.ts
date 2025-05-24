import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscoverSubCategory } from './discover-subcategory.entity';
import { Book } from '../../book/entities/book.entity';

@Entity('discover_category')
export class DiscoverCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 카테고리 이름 (예: 서울대학교 인문학부 추천 도서, 학술원 선정 등)

  @Column({ nullable: true })
  description: string; // 카테고리 설명

  @Column({ default: 0 })
  displayOrder: number; // 화면에 표시될 순서 (0부터 시작, 작을수록 먼저 표시)

  @Column({ default: true })
  isActive: boolean; // 활성 상태 여부

  @OneToMany(
    () => DiscoverSubCategory,
    (subCategory) => subCategory.discoverCategory,
  )
  subCategories: DiscoverSubCategory[];

  @OneToMany(() => Book, (book) => book.discoverCategory)
  books: Book[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
