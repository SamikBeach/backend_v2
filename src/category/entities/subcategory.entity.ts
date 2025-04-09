import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Book } from '../../book/entities/book.entity';

@Entity('subcategory')
export class SubCategory {
  @PrimaryColumn()
  id: string; // western, eastern 등

  @Column()
  name: string; // 서양철학, 동양철학 등

  @ManyToOne(() => Category, (category) => category.subcategories)
  category: Category;

  @OneToMany(() => Book, (book) => book.subcategory)
  books: Book[];
}
