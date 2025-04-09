import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { CategoryService } from '../category/category.service';
import { AppModule } from '../app.module';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import { CreateSubCategoryDto } from '../category/dto/create-subcategory.dto';

interface CategorySeed {
  name: string;
  subcategories: {
    name: string;
  }[];
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoryService = app.get(CategoryService);
  const logger = new Logger('CategorySeed');

  const categories: CategorySeed[] = [
    {
      name: '전체',
      subcategories: [],
    },
    {
      name: '철학',
      subcategories: [
        { name: '서양철학' },
        { name: '동양철학' },
        { name: '종교철학' },
        { name: '윤리학' },
        { name: '미학' },
        { name: '논리학' },
      ],
    },
    {
      name: '문학',
      subcategories: [
        { name: '한국문학' },
        { name: '외국문학' },
        { name: '시' },
        { name: '소설' },
        { name: '수필' },
        { name: '희곡' },
      ],
    },
    {
      name: '역사',
      subcategories: [
        { name: '한국사' },
        { name: '동양사' },
        { name: '서양사' },
        { name: '세계사' },
        { name: '고대사' },
        { name: '근현대사' },
      ],
    },
    {
      name: '정치',
      subcategories: [
        { name: '정치학' },
        { name: '국제관계' },
        { name: '정치사상' },
        { name: '정치철학' },
        { name: '법학' },
        { name: '정치사' },
      ],
    },
    {
      name: '경제',
      subcategories: [
        { name: '경제이론' },
        { name: '경제사' },
        { name: '금융' },
        { name: '경영' },
        { name: '무역' },
        { name: '노동' },
      ],
    },
    {
      name: '사회',
      subcategories: [
        { name: '사회학' },
        { name: '인류학' },
        { name: '심리학' },
        { name: '미디어' },
        { name: '교육' },
        { name: '젠더' },
      ],
    },
    {
      name: '과학',
      subcategories: [
        { name: '자연과학' },
        { name: '물리학' },
        { name: '생물학' },
        { name: '화학' },
        { name: '천문학' },
        { name: '지구과학' },
      ],
    },
    {
      name: '종교',
      subcategories: [
        { name: '기독교' },
        { name: '불교' },
        { name: '이슬람' },
        { name: '샤머니즘' },
        { name: '도교' },
        { name: '종교학' },
      ],
    },
  ];

  try {
    logger.log('카테고리 데이터 초기화 시작...');

    for (const categoryData of categories) {
      try {
        logger.log(`'${categoryData.name}' 카테고리 생성 중...`);

        // 카테고리 생성
        const createCategoryDto: CreateCategoryDto = {
          name: categoryData.name,
        };
        const category = await categoryService.create(createCategoryDto);

        // 서브카테고리 생성
        for (const subcategoryData of categoryData.subcategories) {
          const createSubCategoryDto: CreateSubCategoryDto = {
            name: subcategoryData.name,
          };
          await categoryService.createSubCategory(
            category.id,
            createSubCategoryDto,
          );
        }

        logger.log(
          `'${categoryData.name}' 카테고리 생성 완료 (서브카테고리: ${categoryData.subcategories.length}개)`,
        );
      } catch (error) {
        logger.error(
          `'${categoryData.name}' 카테고리 생성 중 오류 발생: ${error.message}`,
        );
      }
    }

    logger.log('카테고리 데이터 초기화 완료!');
  } catch (error) {
    logger.error(`카테고리 초기화 중 오류 발생: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
