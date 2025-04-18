import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Library } from './library.entity';

// 히스토리 활동 유형을 정의하는 enum
export enum LibraryActivityType {
  LIBRARY_CREATE = 'LIBRARY_CREATE', // 서재 생성
  LIBRARY_UPDATE = 'LIBRARY_UPDATE', // 서재 정보 수정
  LIBRARY_TITLE_UPDATE = 'LIBRARY_TITLE_UPDATE', // 서재 제목 수정
  LIBRARY_DELETE = 'LIBRARY_DELETE', // 서재 삭제
  BOOK_ADD = 'BOOK_ADD', // 책 추가
  BOOK_REMOVE = 'BOOK_REMOVE', // 책 제거
  TAG_ADD = 'TAG_ADD', // 태그 추가
  TAG_REMOVE = 'TAG_REMOVE', // 태그 제거
  SUBSCRIPTION_ADD = 'SUBSCRIPTION_ADD', // 구독 추가
  SUBSCRIPTION_REMOVE = 'SUBSCRIPTION_REMOVE', // 구독 취소
  OTHER = 'OTHER', // 기타 활동
}

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

  // 활동 유형
  @Column({
    type: 'enum',
    enum: LibraryActivityType,
    default: LibraryActivityType.OTHER,
  })
  activityType: LibraryActivityType;

  // 활동과 관련된 사용자 ID (선택 사항)
  @Column({ nullable: true })
  userId: number;

  // 활동과 관련된 책 ID (선택 사항)
  @Column({ nullable: true })
  bookId: number;

  // 활동과 관련된 책 제목 (선택 사항)
  @Column({ nullable: true })
  bookTitle: string;

  // 활동과 관련된 태그 ID (선택 사항)
  @Column({ nullable: true })
  tagId: number;

  @CreateDateColumn()
  createdAt: Date;
}
