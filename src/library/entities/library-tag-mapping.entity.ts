import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Library } from './library.entity';
import { LibraryTag } from '../../library-tag/entities/library-tag.entity';

@Entity('library_tag_mapping')
export class LibraryTagMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.libraryTagMappings)
  library: Library;

  @Column()
  libraryId: number;

  @ManyToOne(() => LibraryTag, (libraryTag) => libraryTag.libraryTagMappings)
  libraryTag: LibraryTag;

  @Column()
  libraryTagId: number;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
