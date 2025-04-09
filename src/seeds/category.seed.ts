import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { CategoryService } from '../category/category.service';
import { Category } from '../category/entities/category.entity';
import { SubCategory } from '../category/entities/subcategory.entity';
import { AppModule } from '../app.module';

interface CategorySeed {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
  }[];
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoryService = app.get(CategoryService);
  const logger = new Logger('CategorySeed');

  const categories: CategorySeed[] = [
    {
      id: 'all',
      name: '전체',
      subcategories: [],
    },
    {
      id: 'philosophy',
      name: '철학',
      subcategories: [
        { id: 'western-philosophy', name: '서양철학' },
        { id: 'eastern-philosophy', name: '동양철학' },
        { id: 'religion-philosophy', name: '종교철학' },
        { id: 'ethics', name: '윤리학' },
        { id: 'aesthetics', name: '미학' },
        { id: 'logic', name: '논리학' },
      ],
    },
    {
      id: 'literature',
      name: '문학',
      subcategories: [
        { id: 'korean-literature', name: '한국문학' },
        { id: 'foreign-literature', name: '외국문학' },
        { id: 'poetry', name: '시' },
        { id: 'novel', name: '소설' },
        { id: 'essay', name: '수필' },
        { id: 'drama', name: '희곡' },
      ],
    },
    {
      id: 'history',
      name: '역사',
      subcategories: [
        { id: 'korean-history', name: '한국사' },
        { id: 'eastern-history', name: '동양사' },
        { id: 'western-history', name: '서양사' },
        { id: 'world-history', name: '세계사' },
        { id: 'ancient-history', name: '고대사' },
        { id: 'modern-history', name: '근현대사' },
      ],
    },
    {
      id: 'political',
      name: '정치',
      subcategories: [
        { id: 'political-science', name: '정치학' },
        { id: 'international-relations', name: '국제관계' },
        { id: 'political-thought', name: '정치사상' },
        { id: 'political-philosophy', name: '정치철학' },
        { id: 'law', name: '법학' },
        { id: 'political-history', name: '정치사' },
      ],
    },
    {
      id: 'economics',
      name: '경제',
      subcategories: [
        { id: 'economic-theory', name: '경제이론' },
        { id: 'economic-history', name: '경제사' },
        { id: 'finance', name: '금융' },
        { id: 'management', name: '경영' },
        { id: 'trade', name: '무역' },
        { id: 'labor', name: '노동' },
      ],
    },
    {
      id: 'society',
      name: '사회',
      subcategories: [
        { id: 'sociology', name: '사회학' },
        { id: 'anthropology', name: '인류학' },
        { id: 'psychology', name: '심리학' },
        { id: 'media', name: '미디어' },
        { id: 'education', name: '교육' },
        { id: 'gender', name: '젠더' },
      ],
    },
    {
      id: 'science',
      name: '과학',
      subcategories: [
        { id: 'natural-science', name: '자연과학' },
        { id: 'physics', name: '물리학' },
        { id: 'biology', name: '생물학' },
        { id: 'chemistry', name: '화학' },
        { id: 'astronomy', name: '천문학' },
        { id: 'earth-science', name: '지구과학' },
      ],
    },
    {
      id: 'religion',
      name: '종교',
      subcategories: [
        { id: 'christianity', name: '기독교' },
        { id: 'buddhism', name: '불교' },
        { id: 'islam', name: '이슬람' },
        { id: 'shamanism', name: '샤머니즘' },
        { id: 'taoism', name: '도교' },
        { id: 'religious-studies', name: '종교학' },
      ],
    },
  ];

  try {
    logger.log('카테고리 데이터 초기화 시작...');

    for (const categoryData of categories) {
      try {
        logger.log(`'${categoryData.name}' 카테고리 생성 중...`);

        // 카테고리 생성
        const category = await categoryService.create({
          id: categoryData.id,
          name: categoryData.name,
        });

        // 서브카테고리 생성
        for (const subcategoryData of categoryData.subcategories) {
          await categoryService.createSubCategory({
            id: subcategoryData.id,
            name: subcategoryData.name,
            categoryId: category.id,
          });
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
