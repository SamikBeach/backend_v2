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
import { CommentLike } from './entities/comment-like.entity';
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
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
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
    userId?: number,
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

      // 비동기 매핑을 Promise.all로 처리
      const result = await Promise.all(
        commentsWithReplies.map((comment) =>
          this.mapCommentToDtoWithReplies(comment, userId),
        ),
      );

      return result;
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
   * 댓글 좋아요
   */
  async likeComment(commentId: number, userId: number): Promise<CommentLike> {
    try {
      // 이미 좋아요 했는지 확인
      const existingLike = await this.commentLikeRepository.findOne({
        where: { commentId, userId },
      });

      if (existingLike) {
        return existingLike; // 이미 좋아요 상태면 그대로 반환
      }

      // 댓글 존재 여부 확인
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException(
          `댓글을 찾을 수 없습니다. (ID: ${commentId})`,
        );
      }

      // 좋아요 생성
      const like = this.commentLikeRepository.create({
        commentId,
        userId,
      });

      const savedLike = await this.commentLikeRepository.save(like);

      // 댓글의 좋아요 수 증가
      comment.likeCount += 1;
      await this.commentRepository.save(comment);

      // 댓글 작성자에게 알림 전송 (자신의 댓글에 좋아요가 표시된 경우는 제외)
      if (comment.authorId !== userId) {
        const username =
          (await this.userService.findOne(userId)).username || '사용자';
        await this.notificationService.createCommentNotification(
          comment.reviewId,
          comment.authorId,
          userId,
          username,
        );
      }

      return savedLike;
    } catch (error) {
      this.logger.error(`댓글 좋아요 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 댓글 좋아요 취소
   */
  async unlikeComment(commentId: number, userId: number): Promise<void> {
    try {
      // 댓글 존재 여부 확인
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException(
          `댓글을 찾을 수 없습니다. (ID: ${commentId})`,
        );
      }

      // 좋아요 삭제
      const result = await this.commentLikeRepository.delete({
        commentId,
        userId,
      });

      // 좋아요 수 감소 (삭제된 항목이 있는 경우에만)
      if (result.affected > 0) {
        comment.likeCount = Math.max(0, comment.likeCount - 1);
        await this.commentRepository.save(comment);
      }
    } catch (error) {
      this.logger.error(`댓글 좋아요 취소 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 댓글에 대한 특정 사용자의 좋아요 여부 확인
   */
  async isCommentLikedByUser(
    commentId: number,
    userId: number,
  ): Promise<boolean> {
    if (!userId) return false;

    const like = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    return !!like;
  }

  /**
   * 댓글 엔티티를 DTO로 변환
   */
  private async mapCommentToDto(
    comment: Comment,
    userId?: number,
  ): Promise<CommentResponseDto> {
    try {
      const author = await this.userService.findOne(comment.authorId);

      // 좋아요 여부 확인
      const isLiked = userId
        ? await this.isCommentLikedByUser(comment.id, userId)
        : false;

      // BASE_URL 환경변수 가져오기
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

      // 프로필 이미지 URL 생성
      let profileImageUrl = null;
      if (author.profileImage) {
        // 이미 완전한 URL인 경우 그대로 사용, 아닌 경우 baseUrl 추가
        profileImageUrl = author.profileImage.startsWith('http')
          ? author.profileImage
          : `${baseUrl}${author.profileImage}`;
      }

      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: author.id,
          username: author.username || '사용자',
          profileImage: profileImageUrl,
        },
        likeCount: comment.likeCount,
        isLiked,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        replies: [],
      };
    } catch (error) {
      this.logger.error(`댓글 DTO 변환 중 오류: ${error.message}`);
      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.authorId,
          username: '사용자',
          profileImage: null,
        },
        likeCount: comment.likeCount,
        isLiked: false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        replies: [],
      };
    }
  }

  /**
   * 댓글과 대댓글을 DTO로 변환
   */
  private async mapCommentToDtoWithReplies(
    comment: Comment,
    userId?: number,
  ): Promise<CommentResponseDto> {
    try {
      const baseDto = await this.mapCommentToDto(comment, userId);

      // 대댓글 처리
      if (comment.replies && comment.replies.length > 0) {
        const replyDtos = await Promise.all(
          comment.replies.map((reply) => this.mapCommentToDto(reply, userId)),
        );
        baseDto.replies = replyDtos;
      }

      return baseDto;
    } catch (error) {
      this.logger.error(`댓글 및 대댓글 DTO 변환 중 오류: ${error.message}`);
      return {
        ...(await this.mapCommentToDto(comment, userId)),
        replies: [],
      };
    }
  }
}
