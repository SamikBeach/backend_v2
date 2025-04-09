import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookService } from '../book/book.service';
import { Logger } from '@nestjs/common';
import { CreateBookDto } from '../book/dto/book.dto';

async function bootstrap() {
  const logger = new Logger('BookSeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookService = app.get(BookService);

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
        logger.log(`'${bookData.title}' 도서 생성 중...`);
        await bookService.create(bookData);
        logger.log(`'${bookData.title}' 도서 생성 완료`);
      } catch (error) {
        logger.error(
          `'${bookData.title}' 도서 생성 중 오류 발생: ${error.message}`,
        );
      }
    }

    logger.log('도서 데이터 초기화 완료!');
  } catch (error) {
    logger.error(`도서 초기화 중 오류 발생: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
