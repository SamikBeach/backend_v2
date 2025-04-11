import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Post } from './entities/post.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponseDto } from './dto/post-response.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  /**
   * 댓글 생성
   */
  async createComment(
    postId: number,
    user: User,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    try {
      // 게시물 존재 확인
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException(
          `게시물을 찾을 수 없습니다. (ID: ${postId})`,
        );
      }

      // 부모 댓글 존재 확인 (대댓글인 경우)
      if (createCommentDto.parentCommentId) {
        const parentComment = await this.commentRepository.findOne({
          where: { id: createCommentDto.parentCommentId },
        });

        if (!parentComment) {
          throw new NotFoundException(
            `부모 댓글을 찾을 수 없습니다. (ID: ${createCommentDto.parentCommentId})`,
          );
        }

        // 부모 댓글이 다른 게시물의 댓글인지 확인
        if (parentComment.postId !== postId) {
          throw new ForbiddenException('잘못된 부모 댓글입니다.');
        }
      }

      // 댓글 저장
      const comment = this.commentRepository.create({
        content: createCommentDto.content,
        postId,
        authorId: user.id,
        parentCommentId: createCommentDto.parentCommentId,
      });

      const savedComment = await this.commentRepository.save(comment);

      // 댓글 수 증가
      post.commentCount += 1;
      await this.postRepository.save(post);

      // 응답 데이터 구성
      return this.mapCommentToDto(savedComment, user);
    } catch (error) {
      this.logger.error(`Failed to create comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * 게시물의 댓글 목록 조회
   */
  async findCommentsByPostId(postId: number): Promise<CommentResponseDto[]> {
    try {
      // 게시물 존재 확인
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException(
          `게시물을 찾을 수 없습니다. (ID: ${postId})`,
        );
      }

      // 최상위 댓글만 조회 (대댓글 제외)
      const comments = await this.commentRepository.find({
        where: {
          postId,
          parentCommentId: null, // 최상위 댓글만
        },
        relations: ['author', 'replies', 'replies.author'],
        order: { createdAt: 'ASC' },
      });

      // 답글 정렬
      for (const comment of comments) {
        if (comment.replies) {
          comment.replies.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
      }

      // 응답 데이터 구성
      return comments.map((comment) =>
        this.mapCommentToDtoWithReplies(comment),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch comments for post ${postId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number, userId: number): Promise<void> {
    try {
      // 댓글 조회
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['post', 'replies'],
      });

      if (!comment) {
        throw new NotFoundException(
          `댓글을 찾을 수 없습니다. (ID: ${commentId})`,
        );
      }

      // 권한 확인
      if (comment.authorId !== userId) {
        throw new ForbiddenException('자신의 댓글만 삭제할 수 있습니다.');
      }

      // 삭제할 총 댓글 수 계산 (자신 + 대댓글)
      const deleteCount = 1 + (comment.replies?.length || 0);

      // 댓글 삭제
      await this.commentRepository.remove(comment);

      // 게시물의 댓글 수 감소
      if (comment.post) {
        comment.post.commentCount = Math.max(
          0,
          comment.post.commentCount - deleteCount,
        );
        await this.postRepository.save(comment.post);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete comment ${commentId}: ${error.message}`,
      );
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
        id: comment.author?.id || comment.authorId,
        username: comment.author?.username || '사용자',
        email: comment.author?.email || '',
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * 대댓글을 포함한 댓글 엔티티를 DTO로 변환
   */
  private mapCommentToDtoWithReplies(comment: Comment): CommentResponseDto {
    const dto = this.mapCommentToDto(comment);

    if (comment.replies && comment.replies.length > 0) {
      dto.replies = comment.replies.map((reply) => this.mapCommentToDto(reply));
    }

    return dto;
  }
}
