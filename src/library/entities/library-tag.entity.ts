import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Library } from './library.entity';

@Entity()
export class LibraryTag {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.tags)
  library: Library;

  @Column()
  libraryId: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
