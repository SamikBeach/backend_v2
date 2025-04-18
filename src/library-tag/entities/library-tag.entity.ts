import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LibraryTagMapping } from '../../library/entities/library-tag-mapping.entity';

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

  @OneToMany(() => LibraryTagMapping, (mapping) => mapping.libraryTag)
  libraryTagMappings: LibraryTagMapping[];

  // 태그에 대한 사용자 정의 메모 (선택 사항)
  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
