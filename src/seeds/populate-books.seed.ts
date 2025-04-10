import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookService } from '../book/book.service';
import { Logger } from '@nestjs/common';
import { CreateBookDto } from '../book/dto/book.dto';

async function bootstrap() {
  const logger = new Logger('PopulateBooksSeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookService = app.get(BookService);

  // 카테고리 ID 맵핑 (데이터베이스에 맞게 수정 필요)
  const categoryMap = {
    철학: 1,
    문학: 2,
    역사: 3,
    정치: 4,
    경제: 5,
    사회: 6,
    과학: 7,
    종교: 8,
  };

  // 서브카테고리 ID 맵핑 (데이터베이스에 맞게 수정 필요)
  const subcategoryMap = {
    서양철학: 1,
    동양철학: 2,
    한국문학: 3,
    외국문학: 4,
    한국사: 5,
    서양사: 6,
    정치학: 7,
    경제이론: 8,
    정치철학: 9,
    사회학: 10,
    심리학: 11,
    불교: 12,
    기독교: 13,
    자연과학: 14,
    종교학: 15,
    소설: 16,
    시: 17,
    동양사: 18,
    금융: 19,
    물리학: 20,
  };

  // 100개의 책 데이터
  const books: Partial<CreateBookDto>[] = [
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
      categoryId: categoryMap['철학'],
      subcategoryId: subcategoryMap['서양철학'],
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
      categoryId: categoryMap['철학'],
      subcategoryId: subcategoryMap['동양철학'],
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
      categoryId: categoryMap['문학'],
      subcategoryId: subcategoryMap['한국문학'],
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
      categoryId: categoryMap['문학'],
      subcategoryId: subcategoryMap['외국문학'],
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
      categoryId: categoryMap['역사'],
      subcategoryId: subcategoryMap['한국사'],
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
      categoryId: categoryMap['역사'],
      subcategoryId: subcategoryMap['서양사'],
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
      categoryId: categoryMap['정치'],
      subcategoryId: subcategoryMap['정치학'],
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
      categoryId: categoryMap['경제'],
      subcategoryId: subcategoryMap['경제이론'],
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
      categoryId: categoryMap['정치'],
      subcategoryId: subcategoryMap['정치철학'],
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
      categoryId: categoryMap['경제'],
      subcategoryId: subcategoryMap['경제이론'],
    },
    // 추가 책 데이터
    {
      title: '죄와 벌',
      author: '도스토옙스키',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002201',
      isbn13: '9788931002201',
      publisher: '이제이북스',
      publishDate: new Date('2018-11-20'),
      rating: 4.9,
      reviews: 230,
      description:
        '러시아 문학의 대표작으로, 라스콜니코프의 범죄와 그의 양심의 고통을 탐구합니다.',
      categoryId: categoryMap['문학'],
      subcategoryId: subcategoryMap['외국문학'],
    },
    {
      title: '순수이성비판',
      author: '임마누엘 칸트',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002202',
      isbn13: '9788931002202',
      publisher: '이제이북스',
      publishDate: new Date('2018-12-10'),
      rating: 4.6,
      reviews: 110,
      description:
        '서양 철학의 가장 중요한 저작 중 하나로, 인간 이성의 한계와 가능성을 탐구합니다.',
      categoryId: categoryMap['철학'],
      subcategoryId: subcategoryMap['서양철학'],
    },
    {
      title: '역사란 무엇인가',
      author: 'E.H. 카',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002203',
      isbn13: '9788931002203',
      publisher: '이제이북스',
      publishDate: new Date('2019-01-15'),
      rating: 4.5,
      reviews: 150,
      description:
        '역사학의 본질과 방법론에 대한 고전적인 입문서로, 역사 연구의 주관성과 객관성을 다룹니다.',
      categoryId: categoryMap['역사'],
      subcategoryId: subcategoryMap['서양사'],
    },
    {
      title: '맹자',
      author: '맹자',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002204',
      isbn13: '9788931002204',
      publisher: '이제이북스',
      publishDate: new Date('2019-02-20'),
      rating: 4.7,
      reviews: 120,
      description:
        '유교 경전의 하나로, 인간의 선천적 선함과 이상적인 정치체제에 대한 맹자의 사상을 담고 있습니다.',
      categoryId: categoryMap['철학'],
      subcategoryId: subcategoryMap['동양철학'],
    },
    {
      title: '일리아스',
      author: '호메로스',
      coverImage:
        'https://image.aladin.co.kr/product/27/97/cover/s11258283418_1.jpg',
      isbn: '9788931002205',
      isbn13: '9788931002205',
      publisher: '이제이북스',
      publishDate: new Date('2019-03-15'),
      rating: 4.8,
      reviews: 160,
      description:
        '서양 문학의 원천이 되는 고대 그리스의 서사시로, 트로이 전쟁을 배경으로 아킬레우스의 분노를 그립니다.',
      categoryId: categoryMap['문학'],
      subcategoryId: subcategoryMap['외국문학'],
    },
  ];

  // 여기서 데이터를 100개까지 확장 (ISBN 번호만 다르게 설정)
  const baseBooks = [...books]; // 원본 도서 데이터 보존
  let isbnCounter = 2300; // ISBN 시작 번호

  // 원본 도서를 기반으로 변형하여 데이터 확장
  while (books.length < 100) {
    for (const baseBook of baseBooks) {
      if (books.length >= 100) break;

      // 원본 도서의 복사본 생성
      const newBook = { ...baseBook };

      // 새로운 ISBN 설정
      const newIsbn = `978893100${isbnCounter}`;
      newBook.isbn = newIsbn;
      newBook.isbn13 = newIsbn;
      isbnCounter++;

      // 출판일 변경 (최근 3년 내 랜덤 날짜)
      const randomYear = 2020 + Math.floor(Math.random() * 3); // 2020-2022
      const randomMonth = 1 + Math.floor(Math.random() * 12); // 1-12
      const randomDay = 1 + Math.floor(Math.random() * 28); // 1-28
      newBook.publishDate = new Date(
        `${randomYear}-${randomMonth}-${randomDay}`,
      );

      // 평점과 리뷰 수 변경
      newBook.rating = 3.5 + Math.random() * 1.5; // 3.5-5.0 사이 랜덤 평점
      newBook.reviews = 10 + Math.floor(Math.random() * 300); // 10-309 사이 랜덤 리뷰 수

      // 일부 책은 coverImage를 null로 설정 (약 20%)
      if (Math.random() < 0.2) {
        newBook.coverImage = null;
      }

      // 책 데이터 추가
      books.push(newBook);
    }
  }

  // 정확히 100개로 맞추기
  while (books.length > 100) {
    books.pop();
  }

  try {
    logger.log('100개 도서 데이터 초기화 시작...');
    let successCount = 0;
    let errorCount = 0;

    for (const bookData of books) {
      try {
        const createBookDto = bookData as CreateBookDto;
        await bookService.create(createBookDto);
        successCount++;

        // 10개마다 진행 상황 로깅
        if (successCount % 10 === 0) {
          logger.log(`${successCount}개 도서 생성 완료`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`도서 생성 중 오류: ${error.message}`);
      }
    }

    logger.log(
      `도서 데이터 초기화 완료! 성공: ${successCount}, 실패: ${errorCount}`,
    );
  } catch (error) {
    logger.error(`도서 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
