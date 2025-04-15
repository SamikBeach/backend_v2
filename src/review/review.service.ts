import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Review } from './entities/review.entity';
import { ReviewImage } from './entities/review-image.entity';
import { ReviewBook } from './entities/review-book.entity';
import { ReviewLike } from './entities/review-like.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FileService } from '../common/services/file.service';
import { BookService } from '../book/book.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { Comment } from './entities/comment.entity';
import { RatingService } from '../rating/rating.service';
import { In } from 'typeorm';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewImage)
    private readonly reviewImageRepository: Repository<ReviewImage>,
    @InjectRepository(ReviewBook)
    private readonly reviewBookRepository: Repository<ReviewBook>,
    @InjectRepository(ReviewLike)
    private readonly reviewLikeRepository: Repository<ReviewLike>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly fileService: FileService,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly ratingService: RatingService,
  ) {}

  /**
   * 리뷰 생성
   */
  async createReview(
    user: User,
    createReviewDto: CreateReviewDto,
    files?: Express.Multer.File[],
  ): Promise<ReviewResponseDto> {
    try {
      // 리뷰 엔티티 생성
      const review = this.reviewRepository.create({
        content: createReviewDto.content,
        type: createReviewDto.type,
        authorId: user.id,
      });

      // 리뷰 저장
      const savedReview = await this.reviewRepository.save(review);

      // 이미지가 있으면 이미지 업로드 및 연결
      if (files && files.length > 0) {
        await this.addImagesToReview(savedReview.id, files);
      }

      // 책 연결
      if (createReviewDto.bookId) {
        await this.addBookToReview(savedReview.id, createReviewDto.bookId);
      }

      // 저장된 리뷰 반환 (응답용 DTO로 변환)
      return this.findReviewById(savedReview.id, user.id);
    } catch (error) {
      this.logger.error(`리뷰 생성 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 모든 리뷰 조회 (페이지네이션)
   */
  async findAllReviews(
    userId?: number,
    page: number = 1,
    limit: number = 10,
    type?: string,
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.author', 'author')
        .leftJoinAndSelect('review.images', 'images')
        .leftJoinAndSelect('review.books', 'reviewBooks')
        .leftJoinAndSelect('reviewBooks.book', 'book')
        .orderBy('review.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      // 타입 필터링
      if (type) {
        queryBuilder.andWhere('review.type = :type', { type });
      }

      // 로그인한 사용자의 경우 좋아요 여부 체크
      if (userId) {
        queryBuilder.leftJoin(
          'review.likes',
          'likes',
          'likes.userId = :userId',
          {
            userId,
          },
        );
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'review_isLiked',
        );
      } else {
        queryBuilder.addSelect('false', 'review_isLiked');
      }

      // 쿼리 실행
      const [reviews, total] = await queryBuilder.getManyAndCount();

      // DTO로 변환
      const reviewDtos = await Promise.all(
        reviews.map((review) => this.mapReviewToResponseDto(review, userId)),
      );

      return {
        reviews: reviewDtos,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch reviews: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 상세 조회
   */
  async findReviewById(
    id: number,
    userId?: number,
  ): Promise<ReviewResponseDto> {
    try {
      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.author', 'author')
        .leftJoinAndSelect('review.images', 'images')
        .leftJoinAndSelect('review.books', 'reviewBooks')
        .leftJoinAndSelect('reviewBooks.book', 'book')
        .where('review.id = :id', { id });

      // 로그인한 사용자의 경우 좋아요 여부 체크
      if (userId) {
        queryBuilder.leftJoin(
          'review.likes',
          'likes',
          'likes.userId = :userId',
          {
            userId,
          },
        );
        queryBuilder.addSelect(
          'CASE WHEN likes.id IS NOT NULL THEN true ELSE false END',
          'review_isLiked',
        );
      } else {
        queryBuilder.addSelect('false', 'review_isLiked');
      }

      const review = await queryBuilder.getOne();

      if (!review) {
        throw new NotFoundException(`리뷰를 찾을 수 없습니다. (ID: ${id})`);
      }

      return this.mapReviewToResponseDto(review, userId);
    } catch (error) {
      this.logger.error(`리뷰 조회 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 수정
   */
  async updateReview(
    id: number,
    userId: number,
    updateReviewDto: UpdateReviewDto,
    files?: Express.Multer.File[],
  ): Promise<ReviewResponseDto> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['author', 'images', 'books'],
      });

      if (!review) {
        throw new NotFoundException(`리뷰를 찾을 수 없습니다. (ID: ${id})`);
      }

      // 자신의 리뷰만 수정 가능
      if (review.authorId !== userId) {
        throw new ForbiddenException('자신의 리뷰만 수정할 수 있습니다.');
      }

      // 내용 업데이트
      if (updateReviewDto.content) {
        review.content = updateReviewDto.content;
      }

      // 타입 업데이트
      if (updateReviewDto.type) {
        review.type = updateReviewDto.type;
      }

      // 이미지 추가
      if (files && files.length > 0) {
        await this.addImagesToReview(id, files);
      }

      // 리뷰 먼저 저장
      await this.reviewRepository.save(review);

      // 책 ID 업데이트
      if ('bookId' in updateReviewDto) {
        // 기존 책 연결을 완전히 삭제
        await this.reviewBookRepository
          .createQueryBuilder()
          .delete()
          .from('review_book')
          .where('reviewId = :reviewId', { reviewId: id })
          .execute();

        // 새 책 ID가 있으면 완전히 새로운 연결 생성
        if (updateReviewDto.bookId) {
          await this.addBookToReview(id, updateReviewDto.bookId);
          this.logger.log(
            `리뷰 ID ${id}의 책이 ID ${updateReviewDto.bookId}로 업데이트됨`,
          );
        } else {
          this.logger.log(`리뷰 ID ${id}의 책 연결이 삭제됨`);
        }
      }

      return this.findReviewById(id, userId);
    } catch (error) {
      this.logger.error(`리뷰 수정 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(id: number, userId: number): Promise<void> {
    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['images', 'books'],
      });

      if (!review) {
        throw new NotFoundException(`리뷰를 찾을 수 없습니다. (ID: ${id})`);
      }

      // 자신의 리뷰만 삭제 가능
      if (review.authorId !== userId) {
        throw new ForbiddenException('자신의 리뷰만 삭제할 수 있습니다.');
      }

      // 이미지 파일 삭제
      for (const image of review.images) {
        try {
          await this.fileService.deleteFile(image.url);
        } catch (error) {
          this.logger.warn(`이미지 삭제 실패: ${image.url} - ${error.message}`);
        }
      }

      // review-book 관계 명시적 삭제
      await this.reviewBookRepository.delete({ reviewId: id });
      this.logger.log(`리뷰 ID ${id}와 연결된 책 관계 삭제 완료`);

      // 리뷰 삭제
      await this.reviewRepository.remove(review);
    } catch (error) {
      this.logger.error(`리뷰 삭제 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 좋아요
   */
  async likeReview(reviewId: number, userId: number): Promise<ReviewLike> {
    try {
      // 이미 좋아요 했는지 확인
      const existingLike = await this.reviewLikeRepository.findOne({
        where: { reviewId, userId },
      });

      if (existingLike) {
        return existingLike; // 이미 좋아요 상태면 그대로 반환
      }

      // 리뷰 존재 여부 확인
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${reviewId} not found`);
      }

      // 좋아요 생성
      const like = this.reviewLikeRepository.create({
        reviewId,
        userId,
      });

      const savedLike = await this.reviewLikeRepository.save(like);

      // 리뷰의 좋아요 수 증가
      if (review.authorId !== userId) {
        await this.notificationService.createLikeNotification(
          reviewId,
          review.authorId,
          userId,
          (await this.userService.findOne(userId)).username || '사용자',
        );
      }

      review.likeCount += 1;
      await this.reviewRepository.save(review);

      return savedLike;
    } catch (error) {
      this.logger.error(`리뷰 좋아요 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 좋아요 취소
   */
  async unlikeReview(reviewId: number, userId: number): Promise<void> {
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

      // 좋아요 삭제
      const result = await this.reviewLikeRepository.delete({
        reviewId,
        userId,
      });

      // 좋아요 수 감소 (삭제된 항목이 있는 경우에만)
      if (result.affected > 0) {
        review.likeCount = Math.max(0, review.likeCount - 1);
        await this.reviewRepository.save(review);
      }
    } catch (error) {
      this.logger.error(
        `Failed to unlike review ${reviewId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 홈화면용 인기 리뷰 조회
   */
  async findPopularReviewsForHome(limit: number = 4): Promise<any> {
    try {
      const popularReviews = await this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.author', 'author')
        .leftJoinAndSelect('review.images', 'images')
        .leftJoinAndSelect('review.books', 'reviewBooks')
        .leftJoinAndSelect('reviewBooks.book', 'book')
        .orderBy('review.likeCount', 'DESC')
        .addOrderBy('review.commentCount', 'DESC')
        .addOrderBy('review.createdAt', 'DESC')
        .take(limit)
        .getMany();

      const simplifiedReviews = await Promise.all(
        popularReviews.map(async (review) => {
          // 첫 번째 이미지만 사용 (미리보기용)
          const previewImageUrl =
            review.images.length > 0 ? review.images[0].url : null;

          // 연결된 책 정보
          const books = review.books?.map((reviewBook) => ({
            id: reviewBook.book.id,
            title: reviewBook.book.title,
            author: reviewBook.book.author,
            coverImage: reviewBook.book.coverImage,
          }));

          // 짧은 버전의 컨텐츠
          const shortContent =
            review.content.length > 100
              ? review.content.substring(0, 100) + '...'
              : review.content;

          return {
            id: review.id,
            content: shortContent,
            type: review.type,
            authorName: review.author.username || '사용자',
            previewImage: previewImageUrl,
            likeCount: review.likeCount,
            commentCount: review.commentCount,
            books,
            createdAt: review.createdAt,
          };
        }),
      );

      return simplifiedReviews;
    } catch (error) {
      this.logger.error(
        `Failed to fetch popular reviews for home: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 리뷰에 이미지 추가
   */
  private async addImagesToReview(
    reviewId: number,
    files: Express.Multer.File[],
  ): Promise<void> {
    try {
      for (const file of files) {
        // 이미지 업로드
        const imageUrl = await this.fileService.uploadImage(file);

        // ReviewImage 엔티티 생성 및 저장
        const reviewImage = this.reviewImageRepository.create({
          url: imageUrl,
          reviewId,
        });
        await this.reviewImageRepository.save(reviewImage);
      }
    } catch (error) {
      this.logger.error(`이미지 업로드 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰에 책 연결
   */
  private async addBookToReview(
    reviewId: number,
    bookId: number,
  ): Promise<void> {
    try {
      if (!reviewId || !bookId) {
        throw new BadRequestException('유효한 reviewId와 bookId가 필요합니다.');
      }

      // 리뷰가 존재하는지 확인
      const review = await this.reviewRepository.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException(`리뷰 ID ${reviewId}를 찾을 수 없습니다.`);
      }

      // 책이 존재하는지 확인
      const book = await this.bookService.findById(bookId);

      if (!book) {
        throw new BadRequestException(`책 ID ${bookId}를 찾을 수 없습니다.`);
      }

      // 책과 리뷰 연결 - 직접 SQL을 사용하여 명확하게 값을 설정
      await this.reviewBookRepository
        .createQueryBuilder()
        .insert()
        .into('review_book')
        .values({
          reviewId: reviewId,
          bookId: bookId,
        })
        .execute();

      this.logger.log(`리뷰 ID ${reviewId}에 책 ID ${bookId} 연결 완료`);
    } catch (error) {
      this.logger.error(`책 연결 중 오류: ${error.message}`);
      throw error;
    }
  }

  /**
   * 리뷰 엔티티를 응답 DTO로 변환
   */
  private async mapReviewToResponseDto(
    review: any,
    userId?: number,
  ): Promise<ReviewResponseDto> {
    // 좋아요 여부
    let isLiked = false;
    if (review.review_isLiked !== undefined) {
      isLiked = review.review_isLiked;
    } else if (userId) {
      const like = await this.reviewLikeRepository.findOne({
        where: { reviewId: review.id, userId },
      });
      isLiked = !!like;
    }

    // 책 정보
    const books = review.books?.map((reviewBook) => ({
      id: reviewBook.book.id,
      title: reviewBook.book.title,
      author: reviewBook.book.author,
      coverImage: reviewBook.book.coverImage,
      publisher: reviewBook.book.publisher,
    }));

    // 리뷰 작성자의 별점 정보 가져오기
    const authorRatings = [];
    if (books && books.length > 0) {
      for (const book of books) {
        const rating = await this.ratingService.findByUserAndBook(
          review.author.id,
          book.id,
        );
        if (rating) {
          authorRatings.push({
            bookId: book.id,
            rating: rating.rating,
            comment: rating.comment,
          });
        }
      }
    }

    return {
      id: review.id,
      content: review.content,
      type: review.type,
      author: {
        id: review.author.id,
        username: review.author.username || '사용자',
        email: review.author.email,
      },
      images: review.images?.map((image) => ({
        id: image.id,
        url: image.url,
        caption: image.caption,
      })),
      books,
      authorRatings: authorRatings.length > 0 ? authorRatings : undefined,
      likeCount: review.likeCount,
      commentCount: review.commentCount,
      isLiked,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * 특정 책에 대한 리뷰 목록 조회
   */
  async findReviewsByBookId(
    bookId: number,
    userId?: number,
    page: number = 1,
    limit: number = 10,
    sort: 'likes' | 'comments' | 'recent' = 'likes',
  ): Promise<any> {
    const skip = (page - 1) * limit;

    try {
      // 책에 연결된 리뷰를 찾기 위해 ReviewBook 테이블을 통해 조회
      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .innerJoin('review.books', 'reviewBooks')
        .innerJoin('reviewBooks.book', 'book')
        .leftJoinAndSelect('review.author', 'author')
        .where('reviewBooks.bookId = :bookId', { bookId });

      // 정렬 방식 설정
      switch (sort) {
        case 'likes':
          // 좋아요순으로 정렬 (좋아요 수 내림차순, 그 다음 최신순)
          queryBuilder
            .leftJoin('review.likes', 'likes')
            .addSelect('COUNT(DISTINCT likes.id)', 'likesCount')
            .groupBy('review.id')
            .addGroupBy('author.id')
            .orderBy('likesCount', 'DESC')
            .addOrderBy('review.createdAt', 'DESC');
          break;
        case 'comments':
          // 댓글많은순으로 정렬 (댓글 수 내림차순, 그 다음 최신순)
          queryBuilder
            .leftJoin('review.comments', 'comments')
            .addSelect('COUNT(DISTINCT comments.id)', 'commentsCount')
            .groupBy('review.id')
            .addGroupBy('author.id')
            .orderBy('commentsCount', 'DESC')
            .addOrderBy('review.createdAt', 'DESC');
          break;
        case 'recent':
        default:
          // 최신순으로 정렬
          queryBuilder.orderBy('review.createdAt', 'DESC');
          break;
      }

      // 페이지네이션 적용
      queryBuilder.skip(skip).take(limit);

      // 리뷰 가져오기
      const [reviews, total] = await queryBuilder.getManyAndCount();

      // 이미지를 별도로 로드
      const reviewIds = reviews.map((review) => review.id);
      const reviewImages = await this.reviewImageRepository.find({
        where: { reviewId: In(reviewIds) },
      });

      // 이미지를 리뷰별로 매핑
      const imagesByReviewId = reviewImages.reduce((acc, img) => {
        if (!acc[img.reviewId]) {
          acc[img.reviewId] = [];
        }
        acc[img.reviewId].push(img);
        return acc;
      }, {});

      // 각 리뷰에 이미지 설정
      reviews.forEach((review) => {
        review.images = imagesByReviewId[review.id] || [];
      });

      // 리뷰 정보 변환
      const reviewsWithDetails = await Promise.all(
        reviews.map(async (review) => {
          // 좋아요 수 가져오기
          const likesCount = await this.reviewLikeRepository.count({
            where: { reviewId: review.id },
          });

          // 댓글 수 가져오기
          const commentsCount = await this.commentRepository.count({
            where: { reviewId: review.id },
          });

          // 로그인한 사용자가 좋아요를 눌렀는지 확인
          let userLiked = false;
          if (userId) {
            const userLike = await this.reviewLikeRepository.findOne({
              where: { reviewId: review.id, userId },
            });

            console.log({ userLike });
          }

          // 책 정보 가져오기
          const reviewBook = await this.reviewBookRepository.findOne({
            where: { reviewId: review.id, bookId: bookId },
            relations: ['book'],
          });

          const book = reviewBook?.book || null;

          // 리뷰 작성자의 별점 정보 가져오기
          let authorRating = null;
          if (book) {
            try {
              this.logger.debug(
                `Fetching rating for review author ${review.authorId} and book ${book.id}`,
              );
              const rating = await this.ratingService.findByUserAndBook(
                review.authorId,
                book.id,
              );

              if (rating) {
                this.logger.debug(`Found rating: ${JSON.stringify(rating)}`);
                authorRating = {
                  bookId: book.id,
                  rating: rating.rating,
                  comment: rating.comment,
                };
              } else {
                this.logger.debug(
                  `No rating found for review author ${review.authorId} and book ${book.id}`,
                );
              }
            } catch (error) {
              this.logger.error(`Error fetching rating: ${error.message}`);
              // Still allow the request to proceed even if rating fetch fails
              authorRating = null;
            }
          } else {
            this.logger.debug(
              `Skipping rating fetch: authorId=${review.authorId}, book=${book?.id}`,
            );
          }

          return {
            id: review.id,
            content: review.content,
            author: {
              id: review.author.id,
              username: review.author.username,
            },
            book: book
              ? {
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  coverImage: book.coverImage,
                  isbn: book.isbn,
                }
              : null,
            images: review.images
              ? review.images.map((image) => ({
                  id: image.id,
                  url: image.url,
                }))
              : [],
            authorRating,
            likesCount,
            commentsCount,
            userLiked,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          };
        }),
      );

      // 페이지네이션 정보 반환
      return {
        data: reviewsWithDetails,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          sort, // 적용된 정렬 방식 포함
        },
      };
    } catch (error) {
      this.logger.error(
        `책 ID ${bookId}의 리뷰 조회 중 오류 발생: ${error.message}`,
      );
      throw error;
    }
  }
}
