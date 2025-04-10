import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookService } from '../book/book.service';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';
import { Logger } from '@nestjs/common';
import { CreateBookDto } from '../book/dto/book.dto';
import { Book } from '../book/entities/book.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const logger = new Logger('BookSeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookService = app.get(BookService);
  const discoverCategoryService = app.get(DiscoverCategoryService);

  // 데이터 존재 여부 확인을 위한 레포지토리 가져오기
  const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));

  // 기존 책 데이터 확인
  const existingBooks = await bookRepository.count();
  if (existingBooks > 0) {
    logger.log(
      `이미 ${existingBooks}권의 책이 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  // 샘플 도서 데이터
  const books: CreateBookDto[] = [
    {
      title: '소크라테스의 변명',
      author: '플라톤',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002175',
      isbn13: '9788931002175',
      publisher: '이제이북스',
      publishDate: new Date('2018-01-15'),
      rating: 4.5,
      reviews: 120,
      description:
        '플라톤의 대화편 중 가장 유명한 작품으로, 소크라테스의 재판 과정과 그의 죽음 직전 모습을 담고 있습니다.',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '논어',
      author: '공자',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002176',
      isbn13: '9788931002176',
      publisher: '이제이북스',
      publishDate: new Date('2018-02-20'),
      rating: 4.7,
      reviews: 150,
      description:
        '동양철학의 기초가 되는 공자의 가르침을 담은 고전으로, 인(仁)과 예(禮)의 개념을 중심으로 인간의 도덕적 삶을 논합니다.',
      categoryId: 1, // 철학
      subcategoryId: 2, // 동양철학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '홍길동전',
      author: '허균',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002177',
      isbn13: '9788931002177',
      publisher: '이제이북스',
      publishDate: new Date('2018-03-10'),
      rating: 4.3,
      reviews: 90,
      description:
        '조선 시대의 대표적인 한글 소설로, 정의로운 도적 홍길동의 활약을 그린 작품입니다.',
      categoryId: 2, // 문학
      subcategoryId: 3, // 한국문학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '1984',
      author: '조지 오웰',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002178',
      isbn13: '9788931002178',
      publisher: '이제이북스',
      publishDate: new Date('2018-04-05'),
      rating: 4.8,
      reviews: 200,
      description:
        '디스토피아 소설의 대표작으로, 전체주의 사회에서의 감시와 통제, 그리고 인간의 자유에 대한 문제를 다룹니다.',
      categoryId: 2, // 문학
      subcategoryId: 4, // 외국문학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '조선왕조실록',
      author: '조선왕조실록편찬위원회',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002179',
      isbn13: '9788931002179',
      publisher: '이제이북스',
      publishDate: new Date('2018-05-15'),
      rating: 4.6,
      reviews: 110,
      description:
        '조선 시대의 공식 역사 기록으로, 1392년부터 1863년까지의 조선 왕조의 역사를 담고 있습니다.',
      categoryId: 3, // 역사
      subcategoryId: 5, // 한국사
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '로마인의 이야기',
      author: '시오노 나나미',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002180',
      isbn13: '9788931002180',
      publisher: '이제이북스',
      publishDate: new Date('2018-06-20'),
      rating: 4.4,
      reviews: 130,
      description:
        '고대 로마의 역사를 소설적으로 재구성한 작품으로, 로마 제국의 흥망성쇠를 다룹니다.',
      categoryId: 3, // 역사
      subcategoryId: 6, // 서양사
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '민주주의론',
      author: '알렉시 드 토크빌',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002181',
      isbn13: '9788931002181',
      publisher: '이제이북스',
      publishDate: new Date('2018-07-10'),
      rating: 4.5,
      reviews: 95,
      description:
        '19세기 프랑스 정치학자가 미국의 민주주의를 분석한 고전으로, 민주주의의 장단점을 다룹니다.',
      categoryId: 4, // 정치
      subcategoryId: 7, // 정치학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '국부론',
      author: '애덤 스미스',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002182',
      isbn13: '9788931002182',
      publisher: '이제이북스',
      publishDate: new Date('2018-08-15'),
      rating: 4.7,
      reviews: 160,
      description:
        '현대 경제학의 기초가 되는 고전으로, 자유시장 경제의 원리와 국부(國富)의 성장에 대해 논합니다.',
      categoryId: 5, // 경제
      subcategoryId: 8, // 경제이론
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '사회계약론',
      author: '장자크 루소',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002183',
      isbn13: '9788931002183',
      publisher: '이제이북스',
      publishDate: new Date('2018-09-20'),
      rating: 4.6,
      reviews: 120,
      description:
        '시민사회와 국가의 기원, 그리고 정치적 권위의 정당성에 대해 논하는 정치철학의 고전입니다.',
      categoryId: 4, // 정치
      subcategoryId: 9, // 정치철학
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '자본론',
      author: '카를 마르크스',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002184',
      isbn13: '9788931002184',
      publisher: '이제이북스',
      publishDate: new Date('2018-10-10'),
      rating: 4.5,
      reviews: 140,
      description:
        '자본주의 경제 체제의 모순과 발전 과정을 분석한 마르크스 경제학의 핵심 저작입니다.',
      categoryId: 5, // 경제
      subcategoryId: 8, // 경제이론
      isFeatured: true,
      isDiscovered: true, // Discovered 도서로 설정
    },
    {
      title: '사회학적 상상력',
      author: 'C. 라이트 밀스',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002185',
      isbn13: '9788931002185',
      publisher: '이제이북스',
      publishDate: new Date('2018-11-15'),
      rating: 4.4,
      reviews: 100,
      description:
        '사회학적 사고방식의 본질을 설명하는 사회학 입문서로, 개인과 사회의 관계를 분석합니다.',
      categoryId: 6, // 사회
      subcategoryId: 10, // 사회학
      isFeatured: true,
    },
    {
      title: '심리학의 이해',
      author: '데이비드 마이어스',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002186',
      isbn13: '9788931002186',
      publisher: '이제이북스',
      publishDate: new Date('2018-12-20'),
      rating: 4.6,
      reviews: 150,
      description:
        '인간의 행동과 심리를 과학적으로 연구하는 심리학의 기본 개념과 이론을 다룹니다.',
      categoryId: 6, // 사회
      subcategoryId: 11, // 심리학
      isFeatured: true,
    },
    {
      title: '종교의 기원',
      author: '에밀 뒤르켐',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002187',
      isbn13: '9788931002187',
      publisher: '이제이북스',
      publishDate: new Date('2019-01-10'),
      rating: 4.5,
      reviews: 110,
      description:
        '종교의 사회적 기능과 기원을 사회학적 관점에서 분석한 종교사회학의 고전입니다.',
      categoryId: 8, // 종교
      subcategoryId: 15, // 종교학
      isFeatured: true,
    },
    {
      title: '불교철학',
      author: '나가르주나',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002188',
      isbn13: '9788931002188',
      publisher: '이제이북스',
      publishDate: new Date('2019-02-15'),
      rating: 4.4,
      reviews: 90,
      description:
        '중관학파의 창시자 나가르주나의 공(空) 사상을 중심으로 불교철학의 핵심을 설명합니다.',
      categoryId: 8, // 종교
      subcategoryId: 12, // 불교
      isFeatured: true,
    },
    {
      title: '물리학의 이해',
      author: '리처드 파인만',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002189',
      isbn13: '9788931002189',
      publisher: '이제이북스',
      publishDate: new Date('2019-03-20'),
      rating: 4.7,
      reviews: 130,
      description:
        '노벨 물리학상 수상자 리처드 파인만이 설명하는 물리학의 기본 원리와 개념입니다.',
      categoryId: 7, // 과학
      subcategoryId: 13, // 물리학
      isFeatured: true,
    },
    {
      title: '생물학의 원리',
      author: '찰스 다윈',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002190',
      isbn13: '9788931002190',
      publisher: '이제이북스',
      publishDate: new Date('2019-04-10'),
      rating: 4.6,
      reviews: 120,
      description:
        '자연선택과 진화론을 통해 생물학의 기본 원리를 설명하는 다윈의 대표작입니다.',
      categoryId: 7, // 과학
      subcategoryId: 14, // 생물학
      isFeatured: true,
    },
  ];

  try {
    logger.log('도서 데이터 초기화 시작...');

    for (const bookData of books) {
      try {
        // 이미 존재하는 ISBN인지 확인
        const existingBook = await bookService.findByIsbn(bookData.isbn);
        if (existingBook) {
          logger.log(
            `ISBN ${bookData.isbn}의 도서가 이미 존재합니다. 건너뜁니다.`,
          );
          continue;
        }

        const newBook = await bookService.create(bookData);
        logger.log(`도서 '${newBook.title}' 생성 완료 (ID: ${newBook.id})`);
      } catch (error) {
        logger.error(`도서 '${bookData.title}' 생성 중 오류: ${error.message}`);
      }
    }

    logger.log('도서 데이터 초기화 완료!');

    // ==== Featured Books 30개 설정 ====
    logger.log('Featured 도서 설정 시작...');

    // 모든 카테고리에 대해 featured 도서 설정
    const categories = [1, 2, 3, 4, 5, 6, 7, 8]; // 철학, 문학, 역사, 정치, 경제, 사회, 과학, 종교

    let featuredCount = 0;
    for (const categoryId of categories) {
      try {
        // 각 카테고리별로 상위 도서를 featured로 설정 (총 30개가 될 때까지)
        const booksToFeature = await bookService.findByCategoryId(categoryId);

        // 각 카테고리에서 필요한 만큼만 선택
        const booksNeeded = Math.min(
          booksToFeature.length,
          Math.ceil(
            (30 - featuredCount) /
              (categories.length - categories.indexOf(categoryId)),
          ),
        );

        if (booksNeeded <= 0) break;

        // 선택된 도서를 featured로 설정
        for (let i = 0; i < booksNeeded && featuredCount < 30; i++) {
          const book = booksToFeature[i];
          if (!book.isFeatured) {
            book.isFeatured = true;
            await bookService.update(book.id, { isFeatured: true });
            featuredCount++;
            logger.log(
              `도서 '${book.title}'를 Featured로 설정 (${featuredCount}/30)`,
            );
          }
        }

        logger.log(`카테고리 ID ${categoryId}: Featured 도서 설정 완료`);
      } catch (error) {
        logger.error(
          `카테고리 ID ${categoryId} Featured 도서 설정 중 오류: ${error.message}`,
        );
      }
    }

    logger.log(`총 ${featuredCount}개의 Featured 도서 설정 완료!`);

    // ==== isDiscovered만 true인 책 20개 설정 ====
    logger.log('isDiscovered 도서 설정 시작...');

    // 모든 도서를 가져옴 (Featured가 아닌 도서 우선)
    const allBooksForDiscovered = await bookService.findAll();
    const nonFeaturedBooksForDiscovered = allBooksForDiscovered.filter(
      (book) => !book.isFeatured,
    );
    const booksPool = [
      ...nonFeaturedBooksForDiscovered,
      ...allBooksForDiscovered.filter((book) => book.isFeatured),
    ];

    let isDiscoveredCount = 0;
    // 20개의 도서를 isDiscovered=true로 설정
    for (let i = 0; i < booksPool.length && isDiscoveredCount < 20; i++) {
      try {
        const book = booksPool[i];
        // 이미 isDiscovered가 true인 경우 스킵
        if (book.isDiscovered) continue;

        await bookService.setBookAsDiscovered(book.id, true);
        isDiscoveredCount++;
        logger.log(
          `도서 '${book.title}'를 isDiscovered=true로 설정 (${isDiscoveredCount}/20)`,
        );
      } catch (error) {
        logger.error(`도서 isDiscovered 설정 중 오류: ${error.message}`);
      }
    }

    logger.log(`총 ${isDiscoveredCount}개의 isDiscovered 도서 설정 완료!`);

    // ==== Discover Books 30개 설정 ====
    logger.log('Discover 도서 설정 시작...');

    // 발견하기 카테고리 가져오기
    const discoverCategories =
      await discoverCategoryService.findAllCategories();

    if (discoverCategories.length === 0) {
      logger.warn(
        '발견하기 카테고리가 없습니다. discover-category.seed.ts를 먼저 실행해주세요.',
      );
    } else {
      let discoveredCount = 0;

      // 모든 카테고리의 도서 가져오기 (featured가 아닌 도서 우선)
      const allBooks = await bookService.findAll();
      const nonFeaturedBooks = allBooks.filter((book) => !book.isFeatured);
      const booksToDiscover = [
        ...nonFeaturedBooks,
        ...allBooks.filter((book) => book.isFeatured),
      ];

      // 발견하기 카테고리별로 도서 분배
      for (
        let i = 0;
        i < discoverCategories.length && discoveredCount < 30;
        i++
      ) {
        const discoverCategory = discoverCategories[i];

        // 서브카테고리 가져오기
        const subCategories =
          await discoverCategoryService.findSubCategoriesByCategory(
            discoverCategory.id,
          );

        // 각 카테고리에 할당할 도서 수 (마지막 카테고리는 나머지 모두)
        const booksPerCategory =
          i === discoverCategories.length - 1
            ? 30 - discoveredCount
            : Math.ceil(
                (30 - discoveredCount) / (discoverCategories.length - i),
              );

        if (booksPerCategory <= 0) break;

        // 각 서브카테고리별로 도서 할당
        for (let j = 0; j < subCategories.length && discoveredCount < 30; j++) {
          const subCategory = subCategories[j];

          // 각 서브카테고리에 할당할 도서 수
          const booksPerSubCategory =
            j === subCategories.length - 1
              ? booksPerCategory -
                Math.floor(discoveredCount % booksPerCategory)
              : Math.ceil(booksPerCategory / subCategories.length);

          // 도서 할당
          for (
            let k = 0;
            k < booksPerSubCategory && discoveredCount < 30;
            k++
          ) {
            const bookIndex = discoveredCount % booksToDiscover.length;
            const book = booksToDiscover[bookIndex];

            try {
              await bookService.addBookToDiscoverCategory(
                book.id,
                discoverCategory.id,
                subCategory.id,
              );
              discoveredCount++;
              logger.log(
                `도서 '${book.title}'를 Discover 카테고리 '${discoverCategory.name}' > '${subCategory.name}'에 추가 (${discoveredCount}/30)`,
              );
            } catch (error) {
              logger.error(
                `도서 '${book.title}'를 Discover에 추가 중 오류: ${error.message}`,
              );
            }
          }
        }
      }

      logger.log(`총 ${discoveredCount}개의 Discover 도서 설정 완료!`);
    }

    logger.log('모든 도서 데이터 초기화 및 설정 완료!');
  } catch (error) {
    logger.error(`도서 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
