import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { SubCategory } from '../../category/entities/subcategory.entity';
import { DiscoverCategory } from '../../discover-category/entities/discover-category.entity';
import { DiscoverSubCategory } from '../../discover-category/entities/discover-subcategory.entity';

@Entity('book')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column()
  isbn: string;

  @Column({ nullable: true })
  isbn13: string;

  @Column()
  publisher: string;

  @Column({ type: 'date', nullable: true })
  publishDate: Date;

  @Column({ nullable: true, type: 'decimal', precision: 3, scale: 1 })
  rating: number;

  @Column({ default: 0 })
  reviews: number;

  @Column()
  description: string;

  @ManyToOne(() => Category, (category) => category.books)
  category: Category;

  @ManyToOne(() => SubCategory, (subcategory) => subcategory.books)
  subcategory: SubCategory;

  // Discover Category 관계
  @ManyToOne(
    () => DiscoverCategory,
    (discoverCategory) => discoverCategory.books,
  )
  discoverCategory: DiscoverCategory;

  // Discover SubCategory 관계
  @ManyToOne(
    () => DiscoverSubCategory,
    (discoverSubCategory) => discoverSubCategory.books,
  )
  discoverSubCategory: DiscoverSubCategory;

  @Column({ default: false })
  isFeatured: boolean; // 추천 도서 여부

  @Column({ default: false })
  isDiscovered: boolean; // Discover 도서 여부

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
