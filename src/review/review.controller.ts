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
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { ReviewService } from './review.service';
import { CommentService } from './comment.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CommentResponseDto } from './dto/review-response.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('review')
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
    @Query('type') type?: string | string[],
    @Query('filter') filter?: 'popular' | 'recent',
  ) {
    // type이 string[] 또는 string 둘 다 처리
    const typeArray = Array.isArray(type) ? type : type ? [type] : undefined;

    return this.reviewService.findAllReviews(
      user?.id,
      page ? +page : 1,
      limit ? +limit : 10,
      typeArray,
      filter || 'recent', // 기본값은 최신순
    );
  }

  /**
   * 특정 책에 대한 리뷰 목록 조회
   */
  @Get('book/:bookId')
  @IsPublic()
  @ApiOperation({ summary: '특정 책에 대한 리뷰 목록 조회' })
  @ApiParam({ name: 'bookId', description: '책 ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '특정 책에 대한 리뷰 목록',
  })
  async findReviewsByBookId(
    @GetUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: 'likes' | 'comments' | 'recent',
    @Query('isbn') isbn?: string,
  ) {
    return this.reviewService.findReviewsByBookId(
      bookId,
      user?.id,
      page ? +page : 1,
      limit ? +limit : 10,
      sort || 'likes', // 기본값은 좋아요순
      isbn,
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
  async findCommentsByReviewId(
    @Param('id', ParseIntPipe) reviewId: number,
    @GetUser() user?: User,
  ) {
    return this.commentService.findCommentsByReviewId(reviewId, user?.id);
  }

  /**
   * 댓글 삭제
   */
  @Delete('comment/:id')
  async deleteComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    await this.commentService.deleteComment(commentId, user.id);
    return { success: true };
  }

  /**
   * 댓글 수정
   */
  @Patch('comment/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 수정' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({
    status: 200,
    description: '댓글 수정 성공',
    type: CommentResponseDto,
  })
  async updateComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentService.updateComment(
      commentId,
      user.id,
      updateCommentDto,
    );
  }

  /**
   * 댓글 좋아요
   */
  @Post('comment/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 좋아요' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({
    status: 200,
    description: '댓글 좋아요 성공',
  })
  async likeComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    await this.commentService.likeComment(commentId, user.id);
    return { success: true };
  }

  /**
   * 댓글 좋아요 취소
   */
  @Delete('comment/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 좋아요 취소' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({
    status: 200,
    description: '댓글 좋아요 취소 성공',
  })
  async unlikeComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    await this.commentService.unlikeComment(commentId, user.id);
    return { success: true };
  }

  // 홈화면용 인기 리뷰 API
  @Get('popular/home')
  @IsPublic()
  async findPopularReviewsForHome(
    @Query('limit') limit?: number,
    @GetUser() user?: User,
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.reviewService.findPopularReviewsForHome(limit || 4, user?.id);
  }
}
