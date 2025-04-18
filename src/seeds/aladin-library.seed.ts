import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import { BookService } from '../book/book.service';
import { LibraryService } from '../library/library.service';
import { LibraryTagService } from '../library-tag/library-tag.service';
import { AladinService } from '../common/services/aladin.service';
import { CreateLibraryDto } from '../library/dto/create-library.dto';
import { AddBookToLibraryDto } from '../library/dto/add-book-to-library.dto';
import { AddTagToLibraryDto } from '../library/dto/add-tag-to-library.dto';
import { LibraryTag } from '../library-tag/entities/library-tag.entity';

// 알라딘에서 가져올 책 ISBN 목록
const BOOKS_TO_FETCH = [
  // 철학 분야
  { isbn: '9788937461033', category: '철학' }, // 니체, 차라투스트라는 이렇게 말했다
  { isbn: '9788937462795', category: '철학' }, // 소크라테스의 변명
  { isbn: '9788937462740', category: '철학' }, // 국가(플라톤)
  { isbn: '9791164452859', category: '철학' }, // 노자 도덕경

  // 과학 분야
  { isbn: '9788983711892', category: '과학' }, // 코스모스
  { isbn: '9788934982975', category: '과학' }, // 이기적 유전자
  { isbn: '9788934949671', category: '과학' }, // 시간의 역사

  // 문학 분야
  { isbn: '9788937460012', category: '문학' }, // 노인과 바다
  { isbn: '9788937460050', category: '문학' }, // 데미안
  { isbn: '9788937460470', category: '문학' }, // 죄와 벌

  // 자기계발 분야
  { isbn: '9788901259376', category: '자기계발' }, // 아침 5시의 기적
  { isbn: '9791191360745', category: '자기계발' }, // 마음의 법칙
  { isbn: '9791165341909', category: '자기계발' }, // 아주 작은 습관의 힘
];

// 라이브러리 정의
const LIBRARIES = [
  {
    name: '철학 고전 컬렉션',
    description: '철학 분야의 고전 작품들을 모아놓은 서재입니다.',
    isPublic: true,
    tags: ['철학', '고전', '인문학'],
    categories: ['철학'],
  },
  {
    name: '과학 탐구 서재',
    description: '과학에 관한 교양서와 전문서적을 모아놓은 서재입니다.',
    isPublic: true,
    tags: ['과학', '자연과학', '우주'],
    categories: ['과학'],
  },
  {
    name: '세계 문학 걸작선',
    description: '세계 각국의 문학 걸작들을 수집해둔 서재입니다.',
    isPublic: true,
    tags: ['문학', '소설', '고전문학'],
    categories: ['문학'],
  },
  {
    name: '자기계발 컬렉션',
    description: '자기계발과 성장에 도움이 되는 책들을 모아놓은 서재입니다.',
    isPublic: true,
    tags: ['자기계발', '성장', '습관'],
    categories: ['자기계발'],
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('AladinLibrarySeed');

  try {
    logger.log(
      '시작: 알라딘 API를 통한 도서 데이터 및 라이브러리 시드 생성...',
    );

    const bookService = app.get(BookService);
    const libraryService = app.get(LibraryService);
    const tagService = app.get(LibraryTagService);
    const aladinService = app.get(AladinService);

    // 사용자 ID (1번 사용자가 타겟)
    const userId = 1;

    // 태그 목록 미리 확보
    logger.log('기존 라이브러리 태그 확인 중...');
    const allTags = new Map<string, LibraryTag>();

    // 모든 라이브러리에서 사용하는 태그 이름 목록 수집
    const allTagNames = new Set<string>();
    LIBRARIES.forEach((lib) => {
      lib.tags.forEach((tag) => allTagNames.add(tag));
    });

    // 태그 이름들을 모두 조회하거나 생성
    for (const tagName of allTagNames) {
      try {
        const tag = await tagService.findOrCreateTag(tagName);
        allTags.set(tagName, tag);
        logger.log(`태그 확인/생성: ${tagName} (ID: ${tag.id})`);
      } catch (error) {
        logger.error(`태그 확인/생성 실패 (${tagName}): ${error.message}`);
      }
    }

    // 책 데이터 가져오기 및 저장
    logger.log('알라딘 API에서 책 정보 가져오는 중...');

    const booksByCategory = {};

    for (const bookInfo of BOOKS_TO_FETCH) {
      try {
        logger.log(`ISBN ${bookInfo.isbn} 조회 중...`);
        const book = await bookService.getBookDetailByIsbn(bookInfo.isbn, true);

        logger.log(
          `저장 완료: "${book.title}" (ISBN: ${book.isbn13}, ID: ${book.id})`,
        );

        // 카테고리별로 책 분류
        if (!booksByCategory[bookInfo.category]) {
          booksByCategory[bookInfo.category] = [];
        }
        booksByCategory[bookInfo.category].push(book);
      } catch (error) {
        logger.error(`ISBN ${bookInfo.isbn} 조회 실패: ${error.message}`);
      }
    }

    // 라이브러리 생성 및 책 추가
    logger.log('라이브러리 생성 및 책 추가 중...');

    for (const library of LIBRARIES) {
      try {
        // 라이브러리 생성
        const createLibraryDto: CreateLibraryDto = {
          name: library.name,
          description: library.description,
          isPublic: library.isPublic,
        };

        const createdLibrary = await libraryService.create(
          userId,
          createLibraryDto,
        );
        logger.log(
          `라이브러리 생성: "${createdLibrary.name}" (ID: ${createdLibrary.id})`,
        );

        // 태그 추가 (이미 확인/생성한 태그 사용)
        for (const tagName of library.tags) {
          try {
            // 이미 확인/생성한 태그 사용
            if (!allTags.has(tagName)) {
              logger.log(`태그를 찾을 수 없음, 건너뜀: ${tagName}`);
              continue;
            }

            try {
              const tagDto: AddTagToLibraryDto = { name: tagName };
              await libraryService.addTagToLibrary(
                createdLibrary.id,
                userId,
                tagDto,
              );
              logger.log(`태그 추가: ${tagName}`);
            } catch (error) {
              // 중복 태그 에러는 무시
              if (
                error.message &&
                error.message.includes('이미 서재에 추가된 태그입니다')
              ) {
                logger.log(`태그 이미 존재함, 무시: ${tagName}`);
              } else {
                logger.error(`태그 추가 실패 (${tagName}): ${error.message}`);
              }
            }
          } catch (error) {
            logger.error(`태그 처리 중 오류 (${tagName}): ${error.message}`);
          }
        }

        // 책 추가
        for (const category of library.categories) {
          const booksToAdd = booksByCategory[category] || [];

          for (const book of booksToAdd) {
            try {
              const bookDto: AddBookToLibraryDto = {
                bookId: book.id,
                note: `${category} 분야의 추천 도서입니다.`,
              };

              await libraryService.addBookToLibrary(
                createdLibrary.id,
                userId,
                bookDto,
              );
              logger.log(`책 추가: "${book.title}" (ID: ${book.id})`);
            } catch (error) {
              // 중복 책 에러는 무시
              if (
                error.message &&
                error.message.includes('이미 라이브러리에 추가된 책입니다')
              ) {
                logger.log(`책 이미 존재함, 무시: "${book.title}"`);
              } else {
                logger.error(`책 추가 실패 (${book.title}): ${error.message}`);
              }
            }
          }
        }

        logger.log(
          `라이브러리 "${createdLibrary.name}" 생성 및 데이터 추가 완료`,
        );
      } catch (error) {
        logger.error(
          `라이브러리 생성 실패 (${library.name}): ${error.message}`,
        );
      }
    }

    logger.log('알라딘 API를 통한 도서 데이터 및 라이브러리 시드 생성 완료!');
  } catch (error) {
    logger.error(`에러 발생: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

// 스크립트 직접 실행 시 bootstrap 함수 실행
if (require.main === module) {
  bootstrap();
}
