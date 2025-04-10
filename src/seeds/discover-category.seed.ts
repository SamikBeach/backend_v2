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
    logger.log('발견하기 카테고리 데이터 초기화 시작...');

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

    // 카테고리 및 서브카테고리 생성
    for (const categoryData of categories) {
      try {
        logger.log(`'${categoryData.name}' 카테고리 생성 중...`);

        // 카테고리 생성
        const createCategoryDto: CreateDiscoverCategoryDto = {
          name: categoryData.name,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
        };
        const category =
          await discoverCategoryService.createCategory(createCategoryDto);

        // 서브카테고리 생성
        for (const subcategoryData of categoryData.subcategories) {
          try {
            const createSubCategoryDto: CreateDiscoverSubCategoryDto = {
              name: subcategoryData.name,
              description: subcategoryData.description,
              displayOrder: subcategoryData.displayOrder,
              discoverCategoryId: category.id,
            };
            await discoverCategoryService.createSubCategory(
              createSubCategoryDto,
            );
          } catch (error) {
            logger.error(
              `서브카테고리 '${subcategoryData.name}' 생성 중 오류: ${error.message}`,
            );
          }
        }

        logger.log(
          `'${categoryData.name}' 카테고리 생성 완료 (서브카테고리: ${categoryData.subcategories.length}개)`,
        );
      } catch (error) {
        logger.error(
          `'${categoryData.name}' 카테고리 생성 중 오류: ${error.message}`,
        );
      }
    }

    // 예시 도서를 발견하기 카테고리에 추가 (여기서는 처음 5개 도서를 가져와 첫 번째 카테고리에 추가)
    try {
      const allBooks = await bookService.findAll();
      if (allBooks.length > 0) {
        const firstCategory = await discoverCategoryService.findAllCategories();
        if (firstCategory.length > 0) {
          const categoryId = firstCategory[0].id;
          const subcategories =
            await discoverCategoryService.findSubCategoriesByCategory(
              categoryId,
            );

          // 첫 번째 카테고리의 첫 번째 서브카테고리에 도서 추가
          if (subcategories.length > 0) {
            const subcategoryId = subcategories[0].id;

            // 처음 5개 도서 추가
            for (let i = 0; i < Math.min(5, allBooks.length); i++) {
              const book = allBooks[i];
              await bookService.addBookToDiscoverCategory(
                book.id,
                categoryId,
                subcategoryId,
              );
              logger.log(
                `도서 '${book.title}'를 발견하기 카테고리에 추가했습니다.`,
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error(`도서 추가 중 오류: ${error.message}`);
    }

    logger.log('발견하기 카테고리 데이터 초기화 완료!');
  } catch (error) {
    logger.error(`발견하기 카테고리 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
