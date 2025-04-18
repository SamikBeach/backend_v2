import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Library } from '../../library/entities/library.entity';

@Entity('library_tag')
export class LibraryTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  usageCount: number;

  @ManyToOne(() => Library, (library) => library.tags, { nullable: true })
  @JoinColumn({ name: 'library_id' })
  library: Library;

  @Column({ nullable: true })
  @Index()
  libraryId: number;

  // 태그에 대한 사용자 정의 메모 (선택 사항)
  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
