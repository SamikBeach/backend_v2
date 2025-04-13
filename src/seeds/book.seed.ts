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
      title: '사피엔스',
      author: '유발 하라리',
      coverImage:
        'https://image.aladin.co.kr/product/92/29/cover500/8925400669_2.jpg',
      isbn: '8925400669',
      isbn13: '9788925400662',
      publisher: '김영사',
      publishDate: new Date('2015-11-24'),
      rating: 4.7,
      reviews: 324,
      description:
        '인류의 역사와 문명의 진화, 그리고 미래에 대한 통찰을 다룬 베스트셀러',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '호모 데우스',
      author: '유발 하라리',
      coverImage:
        'https://image.aladin.co.kr/product/8955/51/cover500/892541077x_1.jpg',
      isbn: '892541077X',
      isbn13: '9788925410777',
      publisher: '김영사',
      publishDate: new Date('2017-05-15'),
      rating: 4.6,
      reviews: 278,
      description:
        '인류의 미래와 인공지능, 생명공학의 발전이 가져올 변화에 대한 탐구',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '21세기를 위한 21가지 제언',
      author: '유발 하라리',
      coverImage:
        'https://image.aladin.co.kr/product/30258/88/cover500/8925417316_1.jpg',
      isbn: '8925417316',
      isbn13: '9788925417318',
      publisher: '김영사',
      publishDate: new Date('2023-03-01'),
      rating: 4.5,
      reviews: 156,
      description:
        '변화하는 세계에서 우리가 직면한 도전과 그 대응책에 대한 통찰',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '정의란 무엇인가',
      author: '마이클 샌델',
      coverImage:
        'https://image.aladin.co.kr/product/8298/15/cover500/8930087272_1.jpg',
      isbn: '8930087272',
      isbn13: '9788930087278',
      publisher: '와이즈베리',
      publishDate: new Date('2014-11-20'),
      rating: 4.8,
      reviews: 412,
      description:
        '정의의 다양한 관점과 윤리적 딜레마를 통해 생각해보는 철학 입문서',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '공정하다는 착각',
      author: '마이클 샌델',
      coverImage:
        'https://image.aladin.co.kr/product/8298/20/cover500/8930087280_1.jpg',
      isbn: '8930087280',
      isbn13: '9788930087285',
      publisher: '와이즈베리',
      publishDate: new Date('2020-12-01'),
      rating: 4.5,
      reviews: 287,
      description:
        '능력주의 사회의 모순과 불평등, 그리고 새로운 정의에 대한 성찰',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '소크라테스의 변명',
      author: '플라톤',
      coverImage:
        'https://image.aladin.co.kr/product/291/92/cover500/8949705060_1.jpg',
      isbn: '8949705060',
      isbn13: '9788949705064',
      publisher: '문예출판사',
      publishDate: new Date('2003-08-15'),
      rating: 4.6,
      reviews: 198,
      description: '진리를 향한 소크라테스의 마지막 변론과 철학적 신념',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '국가',
      author: '플라톤',
      coverImage:
        'https://image.aladin.co.kr/product/10684/17/cover500/8949716003_1.jpg',
      isbn: '8949716003',
      isbn13: '9788949716008',
      publisher: '문예출판사',
      publishDate: new Date('2017-05-20'),
      rating: 4.7,
      reviews: 165,
      description: '이상적인 국가와 정의에 대한 플라톤의 대화편',
      categoryId: 4, // 정치
      subcategoryId: 9, // 정치철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '군주론',
      author: '니콜로 마키아벨리',
      coverImage:
        'https://image.aladin.co.kr/product/775/17/cover500/8957331867_1.jpg',
      isbn: '8957331867',
      isbn13: '9788957331866',
      publisher: '까치',
      publishDate: new Date('2011-04-15'),
      rating: 4.4,
      reviews: 143,
      description: '권력과 통치의 본질에 대한 현실주의적 분석',
      categoryId: 4, // 정치
      subcategoryId: 9, // 정치철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '죽음에 관하여',
      author: '세네카',
      coverImage:
        'https://image.aladin.co.kr/product/1114/72/cover500/8964069188_1.jpg',
      isbn: '8964069188',
      isbn13: '9788964069189',
      publisher: '사람과나무사이',
      publishDate: new Date('2018-06-10'),
      rating: 4.5,
      reviews: 112,
      description: '스토아 철학자 세네카의 죽음과 삶에 대한 성찰',
      categoryId: 1, // 철학
      subcategoryId: 1, // 서양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '모든 것이 되는 법',
      author: '바버라 오클리',
      coverImage:
        'https://image.aladin.co.kr/product/4213/78/cover500/8968171335_1.jpg',
      isbn: '8968171335',
      isbn13: '9788968171338',
      publisher: '와이즈베리',
      publishDate: new Date('2015-09-20'),
      rating: 4.6,
      reviews: 189,
      description: '학습과 뇌의 메커니즘을 통해 알아보는 효과적인 학습 방법',
      categoryId: 3, // 교육
      subcategoryId: 4, // 교육심리
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '도덕경',
      author: '노자',
      coverImage:
        'https://image.aladin.co.kr/product/39/89/cover500/8970133860_2.jpg',
      isbn: '8970133860',
      isbn13: '9788970133867',
      publisher: '현암사',
      publishDate: new Date('2002-01-01'),
      rating: 4.7,
      reviews: 210,
      description: '도와 덕에 관한 동양 철학의 고전',
      categoryId: 1, // 철학
      subcategoryId: 2, // 동양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '논어',
      author: '공자',
      coverImage:
        'https://image.aladin.co.kr/product/875/67/cover500/8970137882_2.jpg',
      isbn: '8970137882',
      isbn13: '9788970137889',
      publisher: '현암사',
      publishDate: new Date('2012-05-15'),
      rating: 4.6,
      reviews: 178,
      description: '공자와 제자들의 대화를 통해 배우는 삶의 지혜',
      categoryId: 1, // 철학
      subcategoryId: 2, // 동양철학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '사기열전',
      author: '사마천',
      coverImage:
        'https://image.aladin.co.kr/product/10044/22/cover500/8979661304_1.jpg',
      isbn: '8979661304',
      isbn13: '9788979661309',
      publisher: '민음사',
      publishDate: new Date('2016-08-25'),
      rating: 4.8,
      reviews: 156,
      description: '중국 역사상 다양한 인물들의 삶과 업적을 기록한 역사서',
      categoryId: 3, // 역사
      subcategoryId: 6, // 중국사
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '열하일기',
      author: '박지원',
      coverImage:
        'https://image.aladin.co.kr/product/25632/27/cover500/8979661975_2.jpg',
      isbn: '8979661975',
      isbn13: '9788979661972',
      publisher: '민음사',
      publishDate: new Date('2020-06-15'),
      rating: 4.5,
      reviews: 124,
      description: '조선 후기 실학자 연암 박지원의 중국 여행기',
      categoryId: 3, // 역사
      subcategoryId: 5, // 한국사
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '국부론',
      author: '애덤 스미스',
      coverImage:
        'https://image.aladin.co.kr/product/36/73/cover500/8981682798_1.gif',
      isbn: '8981682798',
      isbn13: '9788981682798',
      publisher: '동서문화사',
      publishDate: new Date('2001-03-10'),
      rating: 4.7,
      reviews: 167,
      description: '현대 자본주의 경제학의 기초를 다진 고전',
      categoryId: 5, // 경제
      subcategoryId: 8, // 경제이론
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '자본론',
      author: '카를 마르크스',
      coverImage:
        'https://image.aladin.co.kr/product/5/54/cover500/8982870547_1.jpg',
      isbn: '8982870547',
      isbn13: '9788982870545',
      publisher: '비봉출판사',
      publishDate: new Date('2008-11-20'),
      rating: 4.6,
      reviews: 145,
      description: '자본주의 경제체제에 대한 비판적 분석',
      categoryId: 5, // 경제
      subcategoryId: 8, // 경제이론
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '사회학적 상상력',
      author: 'C. 라이트 밀스',
      coverImage:
        'https://image.aladin.co.kr/product/9013/39/cover500/8990042194_1.jpg',
      isbn: '8990042194',
      isbn13: '9788990042194',
      publisher: '사회비평사',
      publishDate: new Date('2018-11-15'),
      rating: 4.4,
      reviews: 100,
      description:
        '사회학적 사고방식의 본질을 설명하는 사회학 입문서로, 개인과 사회의 관계를 분석합니다.',
      categoryId: 6, // 사회
      subcategoryId: 10, // 사회학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '심리학의 이해',
      author: '데이비드 마이어스',
      coverImage:
        'https://image.aladin.co.kr/product/24784/23/cover500/8958286342_1.jpg',
      isbn: '8958286342',
      isbn13: '9788958286349',
      publisher: '시그마프레스',
      publishDate: new Date('2018-12-20'),
      rating: 4.6,
      reviews: 150,
      description:
        '인간의 행동과 심리를 과학적으로 연구하는 심리학의 기본 개념과 이론을 다룹니다.',
      categoryId: 6, // 사회
      subcategoryId: 11, // 심리학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '종교의 기원',
      author: '에밀 뒤르켐',
      coverImage:
        'https://image.aladin.co.kr/product/3747/71/cover500/8958620927_1.jpg',
      isbn: '8958620927',
      isbn13: '9788958620921',
      publisher: '길',
      publishDate: new Date('2019-01-10'),
      rating: 4.5,
      reviews: 110,
      description:
        '종교의 사회적 기능과 기원을 사회학적 관점에서 분석한 종교사회학의 고전입니다.',
      categoryId: 8, // 종교
      subcategoryId: 15, // 종교학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '불교철학',
      author: '나가르주나',
      coverImage:
        'https://image.aladin.co.kr/product/109/45/cover500/8935615064_1.jpg',
      isbn: '8935615064',
      isbn13: '9788935615063',
      publisher: '민음사',
      publishDate: new Date('2019-02-15'),
      rating: 4.4,
      reviews: 90,
      description:
        '중관학파의 창시자 나가르주나의 공(空) 사상을 중심으로 불교철학의 핵심을 설명합니다.',
      categoryId: 8, // 종교
      subcategoryId: 12, // 불교
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '파인만 물리학 강의',
      author: '리처드 파인만',
      coverImage:
        'https://image.aladin.co.kr/product/8242/90/cover500/8934403888_1.jpg',
      isbn: '8934403888',
      isbn13: '9788934403883',
      publisher: '승산',
      publishDate: new Date('2019-03-20'),
      rating: 4.7,
      reviews: 130,
      description:
        '노벨 물리학상 수상자 리처드 파인만이 설명하는 물리학의 기본 원리와 개념입니다.',
      categoryId: 7, // 과학
      subcategoryId: 13, // 물리학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '종의 기원',
      author: '찰스 다윈',
      coverImage:
        'https://image.aladin.co.kr/product/65/73/cover500/890208835x_1.jpg',
      isbn: '890208835X',
      isbn13: '9788902088357',
      publisher: '동서문화사',
      publishDate: new Date('2019-04-15'),
      rating: 4.8,
      reviews: 140,
      description:
        '생물 진화론의 기초가 된 다윈의 대표 저작으로, 자연선택설을 통해 종의 진화 과정을 설명합니다.',
      categoryId: 7, // 과학
      subcategoryId: 14, // 생물학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '코스모스',
      author: '칼 세이건',
      coverImage:
        'https://image.aladin.co.kr/product/26/0/cover500/s742633278_1.jpg',
      isbn: '8983711418',
      isbn13: '9788983711410',
      publisher: '사이언스북스',
      publishDate: new Date('2019-05-15'),
      rating: 4.9,
      reviews: 160,
      description:
        '천문학자 칼 세이건이 우주의 기원, 성질, 미래에 대해 탐구한 과학서적입니다.',
      categoryId: 7, // 과학
      subcategoryId: 16, // 천문학
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '프로그래머의 뇌',
      author: '펠리너 헤르만스',
      coverImage:
        'https://image.aladin.co.kr/product/29149/95/cover500/k192834635_1.jpg',
      isbn: '1617298670',
      isbn13: '9781617298677',
      publisher: '한빛미디어',
      publishDate: new Date('2021-07-15'),
      rating: 4.5,
      reviews: 95,
      description:
        '인지과학 관점에서 프로그래밍 기술을 향상시키는 방법을 설명한 책입니다.',
      categoryId: 9, // 컴퓨터
      subcategoryId: 17, // 프로그래밍
      isFeatured: false,
      isDiscovered: true,
    },
    {
      title: '클린 코드',
      author: '로버트 C. 마틴',
      coverImage:
        'https://image.aladin.co.kr/product/9720/43/cover500/8966262147_1.jpg',
      isbn: '8966262147',
      isbn13: '9788966262144',
      publisher: '인사이트',
      publishDate: new Date('2013-12-24'),
      rating: 4.8,
      reviews: 180,
      description:
        '읽기 쉽고 유지보수가 용이한 소프트웨어를 작성하는 방법에 대한 지침서입니다.',
      categoryId: 9, // 컴퓨터
      subcategoryId: 17, // 프로그래밍
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '데이터 과학 입문',
      author: '레이철 슈트',
      coverImage:
        'https://image.aladin.co.kr/product/26875/38/cover500/k882734811_1.jpg',
      isbn: '1491957662',
      isbn13: '9781491957660',
      publisher: '한빛미디어',
      publishDate: new Date('2021-08-30'),
      rating: 4.6,
      reviews: 85,
      description:
        '데이터 분석과 머신러닝의 기초 개념부터 실무 응용까지 다루는 입문서입니다.',
      categoryId: 9, // 컴퓨터
      subcategoryId: 18, // 데이터 과학
      isFeatured: false,
      isDiscovered: true,
    },
    {
      title: '인공지능: 현대적 접근',
      author: '스튜어트 러셀',
      coverImage:
        'https://image.aladin.co.kr/product/25108/29/cover500/8970509208_1.jpg',
      isbn: '8970509208',
      isbn13: '9788970509204',
      publisher: '한빛아카데미',
      publishDate: new Date('2016-10-15'),
      rating: 4.7,
      reviews: 120,
      description:
        '인공지능의 기본 원리와 알고리즘에 대한 포괄적인 설명을 담은 교과서입니다.',
      categoryId: 9, // 컴퓨터
      subcategoryId: 19, // 인공지능
      isFeatured: true,
      isDiscovered: true,
    },
    {
      title: '소셜 미디어와 사회',
      author: '데이비드 키킬로',
      coverImage:
        'https://image.aladin.co.kr/product/27935/73/cover500/k592835620_1.jpg',
      isbn: '1554812690',
      isbn13: '9781554812691',
      publisher: '커뮤니케이션북스',
      publishDate: new Date('2020-03-15'),
      rating: 4.1,
      reviews: 75,
      description:
        '소셜 미디어가 현대 사회에 미치는 영향과 문제점에 대해 탐구한 책입니다.',
      categoryId: 4, // 사회학
      subcategoryId: 13, // 미디어
      isFeatured: false,
      isDiscovered: true,
    },
    {
      title: '경제학 원론',
      author: '그레고리 맨큐',
      coverImage:
        'https://image.aladin.co.kr/product/26487/43/cover500/k292635156_2.jpg',
      isbn: '8952744632',
      isbn13: '9788952744630',
      publisher: '센게이지러닝코리아',
      publishDate: new Date('2018-08-31'),
      rating: 4.7,
      reviews: 130,
      description:
        '현대 경제학의 기본 개념과 원리를 쉽게 설명한 경제학 입문서입니다.',
      categoryId: 5, // 경제학
      subcategoryId: 15, // 경제이론
      isFeatured: true,
      isDiscovered: true,
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
