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
import { PostService } from './post.service';
import { CommentService } from './comment.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@Controller('post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) {}

  /**
   * 게시물 생성 (이미지 업로드 가능)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // 최대 5개 이미지 업로드 허용
  async createPost(
    @GetUser() user: User,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.postService.createPost(user, createPostDto, files);
  }

  /**
   * 게시물 목록 조회 (페이지네이션, 필터링 지원)
   */
  @Get()
  @IsPublic()
  async findAllPosts(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.postService.findAllPosts(
      user?.id,
      page ? +page : 1,
      limit ? +limit : 10,
      type,
    );
  }

  /**
   * 게시물 상세 조회
   */
  @Get(':id')
  @IsPublic()
  async findPostById(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postService.findPostById(id, user?.id);
  }

  /**
   * 게시물 수정 (이미지 업로드 가능)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // 최대 5개 이미지 업로드 허용
  async updatePost(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.postService.updatePost(id, user.id, updatePostDto, files);
  }

  /**
   * 게시물 삭제
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.postService.deletePost(id, user.id);
    return { success: true };
  }

  /**
   * 게시물 좋아요
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    await this.postService.likePost(id, user.id);
    return { success: true };
  }

  /**
   * 게시물 좋아요 취소
   */
  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikePost(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.postService.unlikePost(id, user.id);
    return { success: true };
  }

  /**
   * 댓글 작성
   */
  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentService.createComment(postId, user, createCommentDto);
  }

  /**
   * 게시물의 댓글 목록 조회
   */
  @Get(':id/comment')
  @IsPublic()
  async findCommentsByPostId(@Param('id', ParseIntPipe) postId: number) {
    return this.commentService.findCommentsByPostId(postId);
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
}
