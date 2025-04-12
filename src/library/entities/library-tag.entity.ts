import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Library } from './library.entity';
import { Tag } from './tag.entity';

@Entity()
export class LibraryTag {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Library, (library) => library.tags)
  @JoinColumn({ name: 'library_id' })
  library: Library;

  @Column()
  libraryId: number;

  @ManyToOne(() => Tag, (tag) => tag.libraryTags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @Column()
  tagId: number;

  // 태그에 대한 사용자 정의 메모 (선택 사항)
  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
