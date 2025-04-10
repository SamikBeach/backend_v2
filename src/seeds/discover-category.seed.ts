import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DiscoverCategoryService } from '../discover-category/discover-category.service';
import { BookService } from '../book/book.service';
import { CreateDiscoverCategoryDto } from '../discover-category/dto/create-discover-category.dto';
import { CreateDiscoverSubCategoryDto } from '../discover-category/dto/discover-subcategory.dto';

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

  try {
    logger.log('발견하기 카테고리 및 서브카테고리 데이터 초기화 시작...');

    // 카테고리 데이터 정의
    const categories: CategorySeed[] = [
      {
        name: '서울대학교 인문학부 추천 도서',
        description: '서울대학교 인문학부에서 추천하는 고전 도서 모음',
        displayOrder: 1,
        subcategories: [
          {
            name: '철학과 추천 도서',
            description: '서울대 철학과 교수진 추천 고전',
            displayOrder: 1,
          },
          {
            name: '국문학과 추천 도서',
            description: '국문학과 필독서 목록',
            displayOrder: 2,
          },
          {
            name: '역사학과 추천 도서',
            description: '역사학과 교수진 선정 도서',
            displayOrder: 3,
          },
        ],
      },
      {
        name: '하버드/예일 추천 도서',
        description: '세계 명문대 추천 고전 도서',
        displayOrder: 2,
        subcategories: [
          {
            name: '하버드 인문학부 필독서',
            description: '하버드 인문학부 커리큘럼 도서 목록',
            displayOrder: 1,
          },
          {
            name: '예일대 교양 필독서',
            description: '예일대학교 교양 필수 과정 도서',
            displayOrder: 2,
          },
        ],
      },
      {
        name: '학술원 선정 도서',
        description: '대한민국 학술원에서 선정한 우수 학술 도서',
        displayOrder: 3,
        subcategories: [
          {
            name: '인문 부문',
            description: '인문 분야 학술원 선정 도서',
            displayOrder: 1,
          },
          {
            name: '사회과학 부문',
            description: '사회과학 분야 학술원 선정 도서',
            displayOrder: 2,
          },
          {
            name: '자연과학 부문',
            description: '자연과학 분야 학술원 선정 도서',
            displayOrder: 3,
          },
        ],
      },
      {
        name: '수상작 모음',
        description: '국내외 주요 문학상 수상작 모음',
        displayOrder: 4,
        subcategories: [
          {
            name: '노벨 문학상',
            description: '노벨 문학상 수상 도서',
            displayOrder: 1,
          },
          {
            name: '맨부커상',
            description: '맨부커상 수상 및 후보 도서',
            displayOrder: 2,
          },
          {
            name: '한국 문학상',
            description: '주요 한국 문학상 수상작',
            displayOrder: 3,
          },
        ],
      },
      {
        name: '진로 추천 도서',
        description: '진로별 추천 도서 목록',
        displayOrder: 5,
        subcategories: [
          {
            name: '의학/의료계열',
            description: '의사, 간호사 등 의료인을 위한 추천 도서',
            displayOrder: 1,
          },
          {
            name: '법학/행정',
            description: '법조인, 행정 공무원을 위한 추천 도서',
            displayOrder: 2,
          },
          {
            name: '공학/기술',
            description: '공학도 및 엔지니어를 위한 추천 도서',
            displayOrder: 3,
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
