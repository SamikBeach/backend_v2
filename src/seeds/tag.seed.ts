import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { TagService } from '../tag/tag.service';
import { Tag } from '../library/entities/tag.entity';

interface TagSeed {
  name: string;
  description?: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const tagService = app.get(TagService);
  const logger = new Logger('TagSeed');

  // 데이터 존재 여부 확인을 위한 레포지토리 가져오기
  const tagRepository = app.get<Repository<Tag>>(getRepositoryToken(Tag));

  // 기존 태그 데이터 확인
  const existingTags = await tagRepository.count();
  if (existingTags > 0) {
    logger.log(
      `이미 ${existingTags}개의 태그가 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  // 기본 태그 목록 정의
  const tags: TagSeed[] = [
    // 장르별 태그
    { name: '소설', description: '픽션 문학 작품' },
    { name: '시', description: '시, 시집, 운문 작품' },
    { name: '에세이', description: '에세이, 수필 등 작가의 생각을 담은 글' },
    { name: '역사', description: '역사, 전기, 문명에 관한 서적' },
    { name: '철학', description: '철학, 사상, 윤리학 관련 서적' },
    { name: '과학', description: '자연과학, 물리학, 생물학 등의 과학 서적' },
    { name: '경제', description: '경제학, 금융, 투자 관련 서적' },
    { name: '심리학', description: '심리학, 정신 분석, 행동 심리 관련 서적' },
    { name: '자기계발', description: '자기계발, 습관, 생산성 향상 관련 서적' },
    { name: '예술', description: '미술, 음악, 건축 등 예술 관련 서적' },

    // 주제별 태그
    { name: '고전', description: '시대를 초월한 가치를 지닌 고전 문학' },
    { name: '현대문학', description: '현대 시대의 문학 작품' },
    { name: '인문학', description: '인간의 사상과 문화에 관한 학문 분야' },
    { name: '사회과학', description: '사회 현상과 인간 관계에 관한 학문' },
    { name: '자연과학', description: '자연 현상과 법칙에 관한 학문' },
    { name: '기술공학', description: '기술과 공학 관련 지식' },

    // 독서 목적별 태그
    { name: '필독서', description: '반드시 읽어야 할 추천 도서' },
    { name: '입문서', description: '초보자를 위한 입문 도서' },
    { name: '교양서', description: '일반적인 교양을 위한 도서' },
    { name: '전문서적', description: '특정 분야의 전문적인 지식을 다룬 도서' },
    { name: '학술논문', description: '학술적 연구 결과를 담은 논문이나 서적' },

    // 개인적 분류 태그
    { name: '읽은 책', description: '이미 읽은 책들' },
    { name: '읽고 싶은 책', description: '독서 예정 목록' },
    { name: '좋아하는 책', description: '특별히 좋아하는 책들' },
    {
      name: '추천하고 싶은 책',
      description: '다른 사람에게 추천하고 싶은 책들',
    },

    // 특정 주제 태그
    { name: '리더십', description: '리더십과 관리에 관한 도서' },
    { name: '심리치료', description: '정신 건강과 치료에 관한 도서' },
    { name: '여행', description: '여행, 모험, 탐험에 관한 도서' },
    { name: '요리', description: '요리, 음식, 음식 문화에 관한 도서' },
    { name: '환경', description: '환경, 생태, 지속가능성에 관한 도서' },
    { name: 'IT', description: '정보기술, 컴퓨터 과학, 디지털에 관한 도서' },
    { name: '건강', description: '건강, 웰빙, 의학에 관한 도서' },
    { name: '교육', description: '교육, 학습, 교수법에 관한 도서' },

    // 포맷별 태그
    { name: '전자책', description: '전자책 형태로 소장한 도서' },
    { name: '종이책', description: '실물 종이책으로 소장한 도서' },
    { name: '오디오북', description: '오디오북 형태로 소장한 도서' },
  ];

  try {
    logger.log('태그 데이터 초기화 시작...');

    for (const tagData of tags) {
      try {
        // 태그 생성
        const tag = await tagService.findOrCreateTag(tagData.name);

        // 설명 업데이트
        if (tagData.description) {
          await tagService.update(tag.id, null, tagData.description);
        }

        logger.log(`'${tagData.name}' 태그 생성 완료`);
      } catch (error) {
        logger.error(`'${tagData.name}' 태그 생성 중 오류: ${error.message}`);
      }
    }

    logger.log(`총 ${tags.length}개의 태그 데이터 초기화 완료!`);
  } catch (error) {
    logger.error(`태그 초기화 중 오류: ${error.message}`);
  } finally {
    await app.close();
  }
}

bootstrap();
