import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { PostBook } from './entities/post-book.entity';
import { PostLike } from './entities/post-like.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FileService } from '../common/services/file.service';
import { User } from '../user/entities/user.entity';
import { BookService } from '../book/book.service';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,
    @InjectRepository(PostBook)
    private readonly postBookRepository: Repository<PostBook>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    private readonly fileService: FileService,
    private readonly bookService: BookService,
  ) {}

  /**
   * 게시물 생성
   */
  async createPost(
    user: User,
    createPostDto: CreatePostDto,
    files?: Express.Multer.File[],
  ): Promise<PostResponseDto> {
    try {
      // 1. 기본 게시물 정보 저장
      const post = this.postRepository.create({
        content: createPostDto.content,
        type: createPostDto.type,
        authorId: user.id,
      });

      const savedPost = await this.postRepository.save(post);

      // 2. 이미지 처리
      if (files && files.length > 0) {
        await this.addImagesToPost(savedPost.id, files);
      }

      // 3. 책 연결
      if (createPostDto.bookIds && createPostDto.bookIds.length > 0) {
        await this.addBooksToPost(savedPost.id, createPostDto.bookIds);
      }

      // 4. 저장된 게시물 조회하여 반환
      return this.findPostById(savedPost.id, user.id);
    } catch (error) {
      this.logger.error(`Failed to create post: ${error.message}`);
      throw error;
    }
  }

  /**
   * 게시물 목록 조회 (페이지네이션, 필터링 지원)
   */
  async findAllPosts(
    userId?: number,
    page: number = 1,
    limit: number = 10,
    type?: string,
  ): Promise<{
    posts: PostResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // 쿼리 빌더 생성
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.images', 'images')
        .leftJoinAndSelect('post.books', 'postBooks')
        .leftJoinAndSelect('postBooks.book', 'book')
        .orderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      // 필터링: 게시물 타입
      if (type) {
        queryBuilder.andWhere('post.type = :type', { type });
      }

      // 좋아요 상태 추가 쿼리
      if (userId) {
        queryBuilder.leftJoin('post.likes', 'likes', 'likes.userId = :userId', {
          userId,
        });
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'post_isLiked',
        );
      }

      const [posts, total] = await queryBuilder.getManyAndCount();

      // 응답 DTO로 변환
      const postDtos = await Promise.all(
        posts.map((post) => this.mapPostToResponseDto(post, userId)),
      );

      return {
        posts: postDtos,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * 게시물 상세 조회
   */
  async findPostById(id: number, userId?: number): Promise<PostResponseDto> {
    try {
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.images', 'images')
        .leftJoinAndSelect('post.books', 'postBooks')
        .leftJoinAndSelect('postBooks.book', 'book')
        .where('post.id = :id', { id });

      // 좋아요 상태 추가 쿼리
      if (userId) {
        queryBuilder.leftJoin('post.likes', 'likes', 'likes.userId = :userId', {
          userId,
        });
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'post_isLiked',
        );
      }

      const post = await queryBuilder.getOne();

      if (!post) {
        throw new NotFoundException(`게시물을 찾을 수 없습니다. (ID: ${id})`);
      }

      return this.mapPostToResponseDto(post, userId);
    } catch (error) {
      this.logger.error(`Failed to fetch post with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 게시물 업데이트
   */
  async updatePost(
    id: number,
    userId: number,
    updatePostDto: UpdatePostDto,
    files?: Express.Multer.File[],
  ): Promise<PostResponseDto> {
    try {
      // 게시물 존재 및 작성자 확인
      const post = await this.postRepository.findOne({
        where: { id },
        relations: ['author'],
      });

      if (!post) {
        throw new NotFoundException(`게시물을 찾을 수 없습니다. (ID: ${id})`);
      }

      if (post.authorId !== userId) {
        throw new ForbiddenException('자신의 게시물만 수정할 수 있습니다.');
      }

      // 게시물 정보 업데이트
      if (updatePostDto.content) {
        post.content = updatePostDto.content;
      }

      if (updatePostDto.type) {
        post.type = updatePostDto.type;
      }

      await this.postRepository.save(post);

      // 이미지 업데이트 (있는 경우)
      if (files && files.length > 0) {
        // 기존 이미지 삭제
        const existingImages = await this.postImageRepository.find({
          where: { postId: id },
        });

        for (const image of existingImages) {
          await this.fileService.deleteFile(image.url);
          await this.postImageRepository.remove(image);
        }

        // 새 이미지 추가
        await this.addImagesToPost(id, files);
      }

      // 책 연결 업데이트 (있는 경우)
      if (updatePostDto.bookIds) {
        // 기존 연결 삭제
        await this.postBookRepository.delete({ postId: id });

        // 새 연결 추가
        if (updatePostDto.bookIds.length > 0) {
          await this.addBooksToPost(id, updatePostDto.bookIds);
        }
      }

      return this.findPostById(id, userId);
    } catch (error) {
      this.logger.error(
        `Failed to update post with ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 게시물 삭제
   */
  async deletePost(id: number, userId: number): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id },
        relations: ['images'],
      });

      if (!post) {
        throw new NotFoundException(`게시물을 찾을 수 없습니다. (ID: ${id})`);
      }

      if (post.authorId !== userId) {
        throw new ForbiddenException('자신의 게시물만 삭제할 수 있습니다.');
      }

      // 연결된 이미지 파일 삭제
      for (const image of post.images) {
        await this.fileService.deleteFile(image.url);
      }

      // 게시물 삭제 (cascade 설정으로 연결된 엔티티도 함께 삭제됨)
      await this.postRepository.remove(post);
    } catch (error) {
      this.logger.error(
        `Failed to delete post with ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 게시물 좋아요 추가
   */
  async likePost(postId: number, userId: number): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException(
          `게시물을 찾을 수 없습니다. (ID: ${postId})`,
        );
      }

      // 이미 좋아요 했는지 확인
      const existingLike = await this.postLikeRepository.findOne({
        where: { postId, userId },
      });

      if (existingLike) {
        return; // 이미 좋아요 한 경우 아무것도 하지 않음
      }

      // 좋아요 추가
      await this.postLikeRepository.save({
        postId,
        userId,
      });

      // 좋아요 카운트 증가
      post.likeCount += 1;
      await this.postRepository.save(post);
    } catch (error) {
      this.logger.error(`Failed to like post ${postId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 게시물 좋아요 취소
   */
  async unlikePost(postId: number, userId: number): Promise<void> {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException(
          `게시물을 찾을 수 없습니다. (ID: ${postId})`,
        );
      }

      // 좋아요 레코드 찾기
      const existingLike = await this.postLikeRepository.findOne({
        where: { postId, userId },
      });

      if (!existingLike) {
        return; // 좋아요가 없는 경우 아무것도 하지 않음
      }

      // 좋아요 삭제
      await this.postLikeRepository.remove(existingLike);

      // 좋아요 카운트 감소
      post.likeCount = Math.max(0, post.likeCount - 1);
      await this.postRepository.save(post);
    } catch (error) {
      this.logger.error(`Failed to unlike post ${postId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 홈화면용 인기 게시물 조회
   * @param limit 가져올 게시물 수
   */
  async findPopularPostsForHome(limit: number = 4): Promise<any> {
    try {
      // 좋아요 수가 많은 순으로 게시물 조회
      const popularPosts = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.images', 'images')
        .leftJoinAndSelect('post.books', 'postBooks')
        .leftJoinAndSelect('postBooks.book', 'book')
        .orderBy('post.likeCount', 'DESC')
        .addOrderBy('post.commentCount', 'DESC')
        .take(limit)
        .getMany();

      // 홈화면에 표시할 형태로 데이터 가공
      const simplifiedPosts = await Promise.all(
        popularPosts.map(async (post) => {
          // 첫 번째 이미지만 포함
          const previewImage =
            post.images.length > 0 ? post.images[0].url : null;

          // 책 정보
          const postBooks =
            post.books?.map((postBook) => ({
              id: postBook.book.id,
              title: postBook.book.title,
              author: postBook.book.author,
              coverImage: postBook.book.coverImage,
            })) || [];

          // 내용 일부만 표시 (100자 제한)
          const previewContent =
            post.content.length > 100
              ? post.content.substring(0, 100) + '...'
              : post.content;

          return {
            id: post.id,
            content: previewContent,
            type: post.type,
            authorName: post.author.username || '사용자',
            previewImage,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            books: postBooks.slice(0, 1), // 첫 번째 책만 포함
            createdAt: post.createdAt,
          };
        }),
      );

      return simplifiedPosts;
    } catch (error) {
      this.logger.error(
        `Failed to fetch popular posts for home: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 게시물에 이미지 추가
   */
  private async addImagesToPost(
    postId: number,
    files: Express.Multer.File[],
  ): Promise<void> {
    for (const file of files) {
      try {
        const imageUrl = await this.fileService.uploadImage(file);

        await this.postImageRepository.save({
          postId,
          url: imageUrl,
        });
      } catch (error) {
        this.logger.error(`Failed to upload image: ${error.message}`);
        // 개별 이미지 업로드 실패해도 계속 진행
      }
    }
  }

  /**
   * 게시물에 책 연결
   */
  private async addBooksToPost(
    postId: number,
    bookIds: number[],
  ): Promise<void> {
    // 책이 실제로 존재하는지 확인
    const books = await this.bookService.findByIds(bookIds);

    if (books.length === 0) {
      return; // 유효한 책이 없으면 아무 작업도 하지 않음
    }

    // 책 연결 저장
    const postBooks = books.map((book) => ({
      postId,
      bookId: book.id,
    }));

    await this.postBookRepository.save(postBooks);
  }

  /**
   * Post 엔티티를 ResponseDto로 변환
   */
  private async mapPostToResponseDto(
    post: any,
    userId?: number,
  ): Promise<PostResponseDto> {
    // 좋아요 상태 확인
    let isLiked = false;

    // post_isLiked 필드가 쿼리에서 추가된 경우
    if ('post_isLiked' in post) {
      isLiked = post.post_isLiked;
    }
    // 아닌 경우 직접 확인
    else if (userId) {
      const like = await this.postLikeRepository.findOne({
        where: { postId: post.id, userId },
      });
      isLiked = !!like;
    }

    // 책 정보 추출
    const books =
      post.books?.map((postBook) => ({
        id: postBook.book.id,
        title: postBook.book.title,
        author: postBook.book.author,
        coverImage: postBook.book.coverImage,
        publisher: postBook.book.publisher,
      })) || [];

    return {
      id: post.id,
      content: post.content,
      type: post.type,
      author: {
        id: post.author.id,
        username: post.author.username || '사용자',
        email: post.author.email,
      },
      images:
        post.images?.map((image) => ({
          id: image.id,
          url: image.url,
          caption: image.caption,
        })) || [],
      books,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
