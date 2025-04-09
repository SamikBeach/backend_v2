import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { SubCategory } from './subcategory.entity';

@Entity('category')
export class Category {
  @PrimaryColumn()
  id: string; // philosophy, literature 등

  @Column()
  name: string; // 철학, 문학 등

  @OneToMany(() => SubCategory, (subcategory) => subcategory.category)
  subcategories: SubCategory[];
}
