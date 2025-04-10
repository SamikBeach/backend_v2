import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscoverCategory } from './discover-category.entity';
import { Book } from '../../book/entities/book.entity';

@Entity('discover_subcategory')
export class DiscoverSubCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 서브카테고리 이름 (예: 하버드대 추천, 예일대 추천 등)

  @Column({ nullable: true })
  description: string; // 서브카테고리 설명

  @Column({ default: 0 })
  displayOrder: number; // 해당 카테고리 내에서의 표시 순서

  @Column({ default: true })
  isActive: boolean; // 활성 상태 여부

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => DiscoverCategory, (category) => category.subCategories)
  discoverCategory: DiscoverCategory;

  @Column()
  discoverCategoryId: number;

  @OneToMany(() => Book, (book) => book.discoverSubCategory)
  books: Book[];
}
