import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';
import { BookService } from '../book/book.service';
import { CreateDiscoverCategoryDto } from '../discover-category/dto/create-discover-category.dto';
import { CreateDiscoverSubCategoryDto } from '../discover-category/dto/discover-subcategory.dto';
import { DiscoverCategory } from '../discover-category/entities/discover-category.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

interface SubCategorySeed {
  name: string;
  description?: string;
  displayOrder?: number;
}

interface CategorySeed {
  name: string;
  description?: string;
  displayOrder?: number;
  subcategories: SubCategorySeed[];
}

async function bootstrap() {
  const logger = new Logger('DiscoverCategorySeed');
  const app = await NestFactory.createApplicationContext(AppModule);
  const discoverCategoryService = app.get(DiscoverCategoryService);
  const bookService = app.get(BookService);

  // 데이터 존재 여부 확인을 위한 레포지토리 가져오기
  const discoverCategoryRepository = app.get<Repository<DiscoverCategory>>(
    getRepositoryToken(DiscoverCategory),
  );

  // 기존 발견하기 카테고리 데이터 확인
  const existingCategories = await discoverCategoryRepository.count();
  if (existingCategories > 0) {
    logger.log(
      `이미 ${existingCategories}개의 발견하기 카테고리가 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  try {
    logger.log('발견하기 카테고리 및 서브카테고리 데이터 초기화 시작...');

    // library-tag와 일치하는 카테고리 데이터 정의
    const categories: CategorySeed[] = [
      {
        name: '철학',
        description: '철학 분야 추천 도서',
        displayOrder: 1,
        subcategories: [
          {
            name: '서양철학',
            description: '서양 고전 철학과 현대 철학 대표 도서',
            displayOrder: 1,
          },
          {
            name: '동양철학',
            description: '동양 철학 고전과 해설서',
            displayOrder: 2,
          },
          {
            name: '윤리학',
            description: '도덕과 윤리에 관한 고전과 현대 저작',
            displayOrder: 3,
          },
          {
            name: '형이상학',
            description: '존재와 인식에 관한 철학적 탐구',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '과학',
        description: '과학 분야 추천 도서',
        displayOrder: 2,
        subcategories: [
          {
            name: '물리학',
            description: '물리학 명저와 대중 과학서',
            displayOrder: 1,
          },
          {
            name: '생물학',
            description: '생명과학 관련 고전과 최신 저작',
            displayOrder: 2,
          },
          {
            name: '천문학',
            description: '우주와 천체에 관한 과학서',
            displayOrder: 3,
          },
          {
            name: '과학사',
            description: '과학의 역사와 발전에 관한 도서',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '문학',
        description: '문학 분야 추천 도서',
        displayOrder: 3,
        subcategories: [
          {
            name: '세계문학',
            description: '세계 각국의 문학 명작',
            displayOrder: 1,
          },
          {
            name: '한국문학',
            description: '한국 문학의 고전과 현대 작품',
            displayOrder: 2,
          },
          {
            name: '시',
            description: '국내외 시인들의 주요 작품집',
            displayOrder: 3,
          },
          {
            name: '소설',
            description: '고전 소설부터 현대 소설까지',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '역사',
        description: '역사 분야 추천 도서',
        displayOrder: 4,
        subcategories: [
          {
            name: '세계사',
            description: '세계 역사의 주요 사건과 흐름',
            displayOrder: 1,
          },
          {
            name: '한국사',
            description: '한국의 역사를 다룬 고전과 현대 저작',
            displayOrder: 2,
          },
          {
            name: '문명사',
            description: '인류 문명의 발전과 변화를 다룬 도서',
            displayOrder: 3,
          },
          {
            name: '고대사',
            description: '고대 문명과 역사에 관한 저서',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '예술',
        description: '예술 분야 추천 도서',
        displayOrder: 5,
        subcategories: [
          {
            name: '미술',
            description: '미술사와 미술 이론에 관한 도서',
            displayOrder: 1,
          },
          {
            name: '음악',
            description: '클래식 음악과 현대 음악에 관한 저작',
            displayOrder: 2,
          },
          {
            name: '건축',
            description: '건축의 역사와 이론에 관한 도서',
            displayOrder: 3,
          },
          {
            name: '영화',
            description: '영화 이론과 영화사에 관한 저서',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '경제학',
        description: '경제학 분야 추천 도서',
        displayOrder: 6,
        subcategories: [
          {
            name: '경제이론',
            description: '고전 경제학과 현대 경제 이론',
            displayOrder: 1,
          },
          {
            name: '금융',
            description: '금융 시장과 투자에 관한 도서',
            displayOrder: 2,
          },
          {
            name: '경제사',
            description: '경제의 역사적 발전과 변화',
            displayOrder: 3,
          },
          {
            name: '행동경제학',
            description: '심리학과 경제학의 교차점을 다룬 도서',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '심리학',
        description: '심리학 분야 추천 도서',
        displayOrder: 7,
        subcategories: [
          {
            name: '일반심리학',
            description: '심리학의 주요 원리와 이론',
            displayOrder: 1,
          },
          {
            name: '발달심리학',
            description: '인간의 발달과 성장에 관한 심리학 저작',
            displayOrder: 2,
          },
          {
            name: '임상심리학',
            description: '정신 건강과 심리 치료에 관한 도서',
            displayOrder: 3,
          },
          {
            name: '사회심리학',
            description: '집단과 사회 속 인간 행동에 관한 심리학',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '사회학',
        description: '사회학 분야 추천 도서',
        displayOrder: 8,
        subcategories: [
          {
            name: '사회이론',
            description: '사회학의 고전 이론과 현대 이론',
            displayOrder: 1,
          },
          {
            name: '현대사회',
            description: '현대 사회의 구조와 문제에 관한 분석',
            displayOrder: 2,
          },
          {
            name: '불평등',
            description: '사회적 불평등과 계층에 관한 연구',
            displayOrder: 3,
          },
          {
            name: '문화사회학',
            description: '문화와 사회의 상호작용에 관한 도서',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '정치학',
        description: '정치학 분야 추천 도서',
        displayOrder: 9,
        subcategories: [
          {
            name: '정치이론',
            description: '정치철학과 정치 이론의 고전',
            displayOrder: 1,
          },
          {
            name: '국제관계',
            description: '국제 정치와 외교에 관한 도서',
            displayOrder: 2,
          },
          {
            name: '민주주의',
            description: '민주주의의 역사와 이론에 관한 저작',
            displayOrder: 3,
          },
          {
            name: '비교정치',
            description: '다양한 정치 체제의 비교 연구',
            displayOrder: 4,
          },
        ],
      },
      {
        name: '인문학',
        description: '인문학 분야 추천 도서',
        displayOrder: 10,
        subcategories: [
          {
            name: '고전인문',
            description: '동서양의 고전 인문학 저작',
            displayOrder: 1,
          },
          {
            name: '교양인문',
            description: '현대인을 위한 인문 교양 도서',
            displayOrder: 2,
          },
          {
            name: '종교학',
            description: '세계 종교와 종교 사상에 관한 도서',
            displayOrder: 3,
          },
          {
            name: '언어학',
            description: '언어와 의사소통에 관한 인문학적 탐구',
            displayOrder: 4,
          },
        ],
      },
    ];

    // DB에 카테고리 및 서브카테고리 저장
    let categoryIndex = 0;
    for (const categoryData of categories) {
      try {
        // 카테고리 생성
        const createCategoryDto: CreateDiscoverCategoryDto = {
          name: categoryData.name,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
        };

        const category =
          await discoverCategoryService.createCategory(createCategoryDto);

        logger.log(
          `카테고리 '${category.name}' 생성 완료 (ID: ${category.id})`,
        );

        // 서브카테고리 생성
        for (const subCategoryData of categoryData.subcategories) {
          const createSubCategoryDto: CreateDiscoverSubCategoryDto = {
            name: subCategoryData.name,
            description: subCategoryData.description,
            displayOrder: subCategoryData.displayOrder,
            discoverCategoryId: category.id,
          };

          const subCategory =
            await discoverCategoryService.createSubCategory(
              createSubCategoryDto,
            );

          logger.log(
            `서브카테고리 '${subCategory.name}' 생성 완료 (ID: ${subCategory.id})`,
          );
        }

        // 첫 번째 카테고리의 첫 번째 서브카테고리에 도서 추가 예제
        if (categoryIndex === 0) {
          const books = await bookService.findAll();
          if (books.length > 0) {
            const firstSubCategory =
              await discoverCategoryService.findSubCategoriesByCategory(
                category.id,
              );

            if (firstSubCategory.length > 0) {
              const book = books[0];
              try {
                await bookService.addBookToDiscoverCategory(
                  book.id,
                  category.id,
                  firstSubCategory[0].id,
                );
                logger.log(
                  `도서 '${book.title}'를 첫 번째 발견하기 카테고리/서브카테고리에 추가 완료`,
                );
              } catch (error) {
                logger.error(`도서 연결 중 오류: ${error.message}`);
              }
            }
          }
        }
        categoryIndex++;
      } catch (error) {
        logger.error(
          `'${categoryData.name}' 카테고리 시드 중 오류: ${error.message}`,
        );
      }
    }

    logger.log('발견하기 카테고리 데이터 초기화 완료!');
  } catch (error) {
    logger.error(`발견하기 카테고리 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
