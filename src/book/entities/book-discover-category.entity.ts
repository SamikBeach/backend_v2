import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from './book.entity';
import { DiscoverCategory } from '../../discover-category/entities/discover-category.entity';
import { DiscoverSubCategory } from '../../discover-category/entities/discover-subcategory.entity';

@Entity('book_discover_category')
export class BookDiscoverCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.bookDiscoverCategories, {
    onDelete: 'CASCADE',
  })
  book: Book;

  @Column()
  bookId: number;

  @ManyToOne(
    () => DiscoverCategory,
    (discoverCategory) => discoverCategory.bookDiscoverCategories,
    { onDelete: 'CASCADE' },
  )
  discoverCategory: DiscoverCategory;

  @Column()
  discoverCategoryId: number;

  @ManyToOne(
    () => DiscoverSubCategory,
    (discoverSubCategory) => discoverSubCategory.bookDiscoverCategories,
    { onDelete: 'CASCADE', nullable: true },
  )
  discoverSubCategory: DiscoverSubCategory;

  @Column({ nullable: true })
  discoverSubCategoryId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
