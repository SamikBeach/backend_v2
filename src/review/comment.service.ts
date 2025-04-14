import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Review } from './entities/review.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { CommentResponseDto } from './dto/review-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 댓글 생성
   */
  async createComment(
    reviewId: number,
    user: User,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    try {
      // 리뷰 존재 여부 확인
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException(
          `리뷰를 찾을 수 없습니다. (ID: ${reviewId})`,
        );
      }

      // 부모 댓글 존재 여부 확인 (대댓글인 경우)
      let parentComment = null;
      if (createCommentDto.parentCommentId) {
        parentComment = await this.commentRepository.findOne({
          where: { id: createCommentDto.parentCommentId },
        });

        if (!parentComment) {
          throw new NotFoundException(
            `부모 댓글을 찾을 수 없습니다. (ID: ${createCommentDto.parentCommentId})`,
          );
        }

        // 부모 댓글이 현재 리뷰의 댓글인지 확인
        if (parentComment.reviewId !== reviewId) {
          throw new BadRequestException('잘못된 부모 댓글 ID입니다.');
        }
      }

      // 댓글 생성
      const comment = this.commentRepository.create({
        content: createCommentDto.content,
        reviewId,
        authorId: user.id,
        parentCommentId: createCommentDto.parentCommentId,
      });

      const savedComment = await this.commentRepository.save(comment);

      // 리뷰의 댓글 수 증가
      review.commentCount += 1;
      await this.reviewRepository.save(review);

      // 리뷰 작성자에게 알림 전송 (자신의 리뷰에 댓글이 달린 경우는 제외)
      if (review.authorId !== user.id) {
        await this.notificationService.createCommentNotification(
          reviewId,
          review.authorId,
          user.id,
          user.username || '사용자',
        );
      }

      return this.mapCommentToDto(savedComment);
    } catch (error) {
      this.logger.error(`댓글 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰의 댓글 목록 조회
   */
  async findCommentsByReviewId(
    reviewId: number,
  ): Promise<CommentResponseDto[]> {
    try {
      // 리뷰 존재 여부 확인
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException(
          `리뷰를 찾을 수 없습니다. (ID: ${reviewId})`,
        );
      }

      // 최상위 댓글과 그 대댓글들을 함께 조회
      const comments = await this.commentRepository.find({
        where: { reviewId, parentCommentId: null },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });

      // 각 최상위 댓글의 대댓글 조회
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await this.commentRepository.find({
            where: { parentCommentId: comment.id },
            relations: ['author'],
            order: { createdAt: 'ASC' },
          });

          comment['replies'] = replies;
          return comment;
        }),
      );

      return commentsWithReplies.map((comment) =>
        this.mapCommentToDtoWithReplies(comment),
      );
    } catch (error) {
      this.logger.error(
        `리뷰 ID ${reviewId}의 댓글 목록 조회 중 오류: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number, userId: number): Promise<void> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['author'],
      });

      if (!comment) {
        throw new NotFoundException(
          `댓글을 찾을 수 없습니다. (ID: ${commentId})`,
        );
      }

      // 자신의 댓글만 삭제 가능
      if (comment.authorId !== userId) {
        throw new ForbiddenException('자신의 댓글만 삭제할 수 있습니다.');
      }

      // 이 댓글이 부모 댓글인 경우, 하위 댓글들도 함께 조회
      const replies = await this.commentRepository.find({
        where: { parentCommentId: commentId },
      });

      // 리뷰 조회
      const review = await this.reviewRepository.findOne({
        where: { id: comment.reviewId },
      });

      if (review) {
        // 댓글 수 감소 (이 댓글 + 대댓글 수)
        review.commentCount = Math.max(
          0,
          review.commentCount - (1 + replies.length),
        );
        await this.reviewRepository.save(review);
      }

      // 대댓글들 먼저 삭제
      if (replies.length > 0) {
        await this.commentRepository.remove(replies);
      }

      // 댓글 삭제
      await this.commentRepository.remove(comment);
    } catch (error) {
      this.logger.error(`댓글 삭제 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 댓글 수정
   */
  async updateComment(
    commentId: number,
    userId: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    try {
      // 댓글 존재 여부 확인
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['author'],
      });

      if (!comment) {
        throw new NotFoundException(
          `댓글을 찾을 수 없습니다. (ID: ${commentId})`,
        );
      }

      // 자신의 댓글만 수정 가능
      if (comment.authorId !== userId) {
        throw new ForbiddenException('자신의 댓글만 수정할 수 있습니다.');
      }

      // 댓글 내용 업데이트
      comment.content = updateCommentDto.content;
      const updatedComment = await this.commentRepository.save(comment);

      this.logger.log(`댓글 ID ${commentId} 수정 완료`);
      return this.mapCommentToDto(updatedComment);
    } catch (error) {
      this.logger.error(`댓글 수정 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 댓글 엔티티를 DTO로 변환
   */
  private mapCommentToDto(
    comment: Comment,
    currentUser?: User,
  ): CommentResponseDto {
    return {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author?.id,
        username: comment.author?.username || '사용자',
        email: comment.author?.email,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * 댓글과 대댓글을 DTO로 변환
   */
  private mapCommentToDtoWithReplies(comment: Comment): CommentResponseDto {
    const commentDto = this.mapCommentToDto(comment);

    if (comment['replies'] && comment['replies'].length > 0) {
      commentDto.replies = comment['replies'].map((reply) =>
        this.mapCommentToDto(reply),
      );
    }

    return commentDto;
  }
}
