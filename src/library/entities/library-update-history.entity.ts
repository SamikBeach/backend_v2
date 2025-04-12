import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Library } from './library.entity';

@Entity()
export class LibraryUpdateHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.updateHistory)
  library: Library;

  @Column()
  libraryId: number;

  @Column()
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
