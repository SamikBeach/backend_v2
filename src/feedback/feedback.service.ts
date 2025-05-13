import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * 새 피드백을 생성합니다.
   * @param createFeedbackDto 피드백 생성 DTO
   * @param user 사용자 정보 (로그인한 경우)
   * @param ipAddress IP 주소
   * @param userAgent 사용자 에이전트
   * @returns 생성된 피드백 정보
   */
  async create(
    createFeedbackDto: CreateFeedbackDto,
    user?: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<FeedbackResponseDto> {
    try {
      // 피드백 엔티티 생성
      const feedback = this.feedbackRepository.create({
        content: createFeedbackDto.content,
        email: user?.email, // 사용자 정보에서 이메일 추출
        userId: user?.id,
        ipAddress,
        userAgent,
      });

      // 피드백 저장
      const savedFeedback = await this.feedbackRepository.save(feedback);

      this.logger.log(`새 피드백이 생성되었습니다. ID: ${savedFeedback.id}`);

      // 응답 DTO 생성
      return {
        id: savedFeedback.id,
        content: savedFeedback.content,
        email: savedFeedback.email,
        createdAt: savedFeedback.createdAt,
        message: '피드백이 성공적으로 제출되었습니다. 감사합니다!',
      };
    } catch (error) {
      this.logger.error(`피드백 생성 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 모든 피드백을 조회합니다. (관리자용)
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @returns 피드백 목록과 페이지네이션 정보
   */
  async findAll(page: number = 1, limit: number = 10) {
    try {
      const [feedbacks, total] = await this.feedbackRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        relations: ['user'],
      });

      return {
        data: feedbacks,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`피드백 목록 조회 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 피드백을 ID로 조회합니다.
   * @param id 피드백 ID
   * @returns 피드백 정보
   */
  async findOne(id: number) {
    try {
      return await this.feedbackRepository.findOne({
        where: { id },
        relations: ['user'],
      });
    } catch (error) {
      this.logger.error(`피드백 조회 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 피드백의 해결 상태를 업데이트합니다. (관리자용)
   * @param id 피드백 ID
   * @param isResolved 해결 상태
   * @returns 업데이트된 피드백 정보
   */
  async updateResolutionStatus(id: number, isResolved: boolean) {
    try {
      await this.feedbackRepository.update(id, { isResolved });
      return this.findOne(id);
    } catch (error) {
      this.logger.error(`피드백 상태 업데이트 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 피드백을 삭제합니다. (관리자용)
   * @param id 피드백 ID
   */
  async remove(id: number) {
    try {
      const result = await this.feedbackRepository.delete(id);
      if (result.affected === 0) {
        throw new Error(`ID ${id}인 피드백을 찾을 수 없습니다.`);
      }
      this.logger.log(`피드백 ID ${id}가 삭제되었습니다.`);
      return { message: `피드백 ID ${id}가 삭제되었습니다.` };
    } catch (error) {
      this.logger.error(`피드백 삭제 중 오류 발생: ${error.message}`);
      throw error;
    }
  }
}
