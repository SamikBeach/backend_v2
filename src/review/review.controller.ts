import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFiles,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { ReviewService } from './review.service';
import { CommentService } from './comment.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly commentService: CommentService,
  ) {}

  /**
   * 리뷰 생성 (이미지 업로드 가능)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // 최대 5개 이미지 업로드 허용
  async createReview(
    @GetUser() user: User,
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reviewService.createReview(user, createReviewDto, files);
  }

  /**
   * 리뷰 목록 조회 (페이지네이션, 필터링 지원)
   */
  @Get()
  @IsPublic()
  async findAllReviews(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.reviewService.findAllReviews(
      user?.id,
      page ? +page : 1,
      limit ? +limit : 10,
      type,
    );
  }

  /**
   * 리뷰 상세 조회
   */
  @Get(':id')
  @IsPublic()
  async findReviewById(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewService.findReviewById(id, user?.id);
  }

  /**
   * 리뷰 수정 (이미지 업로드 가능)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // 최대 5개 이미지 업로드 허용
  async updateReview(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reviewService.updateReview(id, user.id, updateReviewDto, files);
  }

  /**
   * 리뷰 삭제
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.reviewService.deleteReview(id, user.id);
    return { success: true };
  }

  /**
   * 리뷰 좋아요
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeReview(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.reviewService.likeReview(id, user.id);
    return { success: true };
  }

  /**
   * 리뷰 좋아요 취소
   */
  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikeReview(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.reviewService.unlikeReview(id, user.id);
    return { success: true };
  }

  /**
   * 댓글 작성
   */
  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) reviewId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentService.createComment(reviewId, user, createCommentDto);
  }

  /**
   * 리뷰의 댓글 목록 조회
   */
  @Get(':id/comment')
  @IsPublic()
  async findCommentsByReviewId(@Param('id', ParseIntPipe) reviewId: number) {
    return this.commentService.findCommentsByReviewId(reviewId);
  }

  /**
   * 댓글 삭제
   */
  @Delete('comment/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    await this.commentService.deleteComment(commentId, user.id);
    return { success: true };
  }

  // 홈화면용 인기 리뷰 API
  @Get('popular/home')
  @IsPublic()
  async findPopularReviewsForHome(
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.reviewService.findPopularReviewsForHome(limit || 4);
  }
}
