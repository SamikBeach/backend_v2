import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { Tag } from '../library/entities/tag.entity';
import { LibraryTag } from '../library/entities/library-tag.entity';
import {
  TagResponseDto,
  TagListResponseDto,
} from '../library/dto/tag-response.dto';

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(LibraryTag)
    private readonly libraryTagRepository: Repository<LibraryTag>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 새로운 태그 생성 또는 기존 태그 조회
   */
  async findOrCreateTag(name: string): Promise<Tag> {
    // 대소문자 구분 없이 정확히 일치하는 태그 찾기
    let tag = await this.tagRepository.findOne({
      where: { name: name.trim() },
    });

    // 태그가 없으면 새로 생성
    if (!tag) {
      tag = this.tagRepository.create({
        name: name.trim(),
        usageCount: 0,
      });
      tag = await this.tagRepository.save(tag);
      this.logger.log(`새로운 태그 생성: ${name}`);
    }

    return tag;
  }

  /**
   * 태그 사용 횟수 증가
   */
  async incrementUsage(tagId: number): Promise<Tag> {
    const tag = await this.findOne(tagId);
    tag.usageCount += 1;
    return this.tagRepository.save(tag);
  }

  /**
   * 태그 사용 횟수 감소
   */
  async decrementUsage(tagId: number): Promise<Tag> {
    const tag = await this.findOne(tagId);
    if (tag.usageCount > 0) {
      tag.usageCount -= 1;
      return this.tagRepository.save(tag);
    }
    return tag;
  }

  /**
   * 태그 ID로 조회
   */
  async findOne(id: number): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`태그 ID ${id}를 찾을 수 없습니다.`);
    }

    return tag;
  }

  /**
   * 모든 태그 조회 (페이지네이션 및 검색 지원)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<TagListResponseDto> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.tagRepository.createQueryBuilder('tag');

    if (search) {
      queryBuilder.where('tag.name LIKE :search', { search: `%${search}%` });
    }

    const [tags, totalCount] = await queryBuilder
      .orderBy('tag.usageCount', 'DESC')
      .addOrderBy('tag.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      tags: tags.map((tag) => this.mapToTagResponseDto(tag)),
      totalCount,
    };
  }

  /**
   * 인기 태그 조회 (사용 횟수 기준)
   */
  async findPopularTags(limit: number = 10): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.find({
      where: { usageCount: MoreThan(0) },
      order: { usageCount: 'DESC', name: 'ASC' },
      take: limit,
    });

    return tags.map((tag) => this.mapToTagResponseDto(tag));
  }

  /**
   * 태그 정보 업데이트
   */
  async update(
    id: number,
    name?: string,
    description?: string,
  ): Promise<TagResponseDto> {
    const tag = await this.findOne(id);

    // 이름 업데이트
    if (name && name !== tag.name) {
      // 이름 중복 체크
      const exists = await this.tagRepository.findOne({
        where: { name: name.trim() },
      });

      if (exists && exists.id !== id) {
        throw new BadRequestException(`이미 존재하는 태그 이름입니다: ${name}`);
      }

      tag.name = name.trim();
    }

    // 설명 업데이트
    if (description !== undefined) {
      tag.description = description;
    }

    const updatedTag = await this.tagRepository.save(tag);
    return this.mapToTagResponseDto(updatedTag);
  }

  /**
   * 두 태그를 병합 (소스 태그의 모든 참조를 타겟 태그로 이동)
   */
  async mergeTags(sourceTagId: number, targetTagId: number): Promise<void> {
    if (sourceTagId === targetTagId) {
      throw new BadRequestException('동일한 태그는 병합할 수 없습니다.');
    }

    const sourceTag = await this.findOne(sourceTagId);
    const targetTag = await this.findOne(targetTagId);

    // 트랜잭션을 사용하여 병합 작업 수행
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 소스 태그를 사용하는 모든 라이브러리 태그를 타겟 태그로 업데이트
      await queryRunner.manager.update(
        LibraryTag,
        { tagId: sourceTagId },
        { tagId: targetTagId, tag: targetTag },
      );

      // 타겟 태그의 사용 횟수 업데이트 (소스 태그의 사용 횟수를 더함)
      targetTag.usageCount += sourceTag.usageCount;
      await queryRunner.manager.save(targetTag);

      // 소스 태그 삭제
      await queryRunner.manager.remove(sourceTag);

      await queryRunner.commitTransaction();
      this.logger.log(`태그 병합 완료: ${sourceTagId} -> ${targetTagId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`태그 병합 실패: ${error.message}`);
      throw new BadRequestException('태그 병합 중 오류가 발생했습니다.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tag 엔티티를 TagResponseDto로 매핑
   */
  private mapToTagResponseDto(tag: Tag): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }
}
