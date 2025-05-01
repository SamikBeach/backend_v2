import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { Book } from '../book/entities/book.entity';
import {
  CreateRatingDto,
  UpdateRatingDto,
  RatingResponseDto,
} from './dto/rating.dto';
import { Not, IsNull } from 'typeorm';
import { BookService } from '../book/book.service';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @Inject(forwardRef(() => BookService))
    private readonly bookService: BookService,
  ) {}

  /**
   * 평점 생성 또는 업데이트
   */
  async createOrUpdate(
    userId: number,
    bookId: number,
    createRatingDto: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    let book: Book;

    // 북아이디가 -1이고 ISBN이 제공된 경우, ISBN으로 책을 찾거나 생성
    if (bookId === -1 && createRatingDto.isbn) {
      this.logger.log(
        `bookId가 -1이고 ISBN ${createRatingDto.isbn}이 제공되어 책을 조회합니다.`,
      );

      try {
        // ISBN으로 책 조회 또는 생성 (saveToDb=true로 설정하여 DB에 저장)
        book = await this.bookService.getBookDetailByIsbn(
          createRatingDto.isbn,
          true,
        );
        bookId = book.id; // 찾거나 생성된 책의 ID로 업데이트
        this.logger.log(
          `ISBN ${createRatingDto.isbn}로 책을 찾았거나 생성했습니다. ID: ${bookId}`,
        );
      } catch (error) {
        this.logger.error(
          `ISBN ${createRatingDto.isbn}로 책을 찾을 수 없습니다: ${error.message}`,
        );
        throw new NotFoundException(
          `ISBN ${createRatingDto.isbn}로 책을 찾을 수 없습니다.`,
        );
      }
    } else {
      // 일반적인 경우: 책이 존재하는지 확인
      book = await this.bookRepository.findOne({ where: { id: bookId } });
      if (!book) {
        throw new NotFoundException('책을 찾을 수 없습니다.');
      }
    }

    // 이미 존재하는 평점이 있는지 확인
    const existingRating = await this.ratingRepository.findOne({
      where: { userId, bookId },
    });

    if (existingRating) {
      // 이미 있다면 업데이트
      return this.update(existingRating.id, createRatingDto, userId);
    }

    // 새로운 평점 생성
    const rating = this.ratingRepository.create({
      userId,
      bookId,
      ...createRatingDto,
    });

    const savedRating = await this.ratingRepository.save(rating);

    // 책의 평점 업데이트
    await this.updateBookRating(bookId);

    return this.mapToResponseDto(savedRating);
  }

  /**
   * 평점 업데이트
   */
  async update(
    id: number,
    updateRatingDto: UpdateRatingDto,
    userId: number,
  ): Promise<RatingResponseDto> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
      relations: ['user', 'book'],
    });

    if (!rating) {
      throw new NotFoundException('평점을 찾을 수 없습니다.');
    }

    // 요청한 사용자가 평점의 소유자인지 확인
    if (rating.userId !== userId) {
      throw new UnauthorizedException('이 평점을 수정할 권한이 없습니다.');
    }

    // 평점 업데이트
    Object.assign(rating, updateRatingDto);

    const updatedRating = await this.ratingRepository.save(rating);

    // 책의 평점 업데이트
    await this.updateBookRating(rating.bookId);

    return this.mapToResponseDto(updatedRating);
  }

  /**
   * 평점 삭제
   */
  async delete(id: number, userId: number): Promise<void> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
    });

    if (!rating) {
      throw new NotFoundException('평점을 찾을 수 없습니다.');
    }

    // 요청한 사용자가 평점의 소유자인지 확인
    if (rating.userId !== userId) {
      throw new UnauthorizedException('이 평점을 삭제할 권한이 없습니다.');
    }

    const bookId = rating.bookId;

    await this.ratingRepository.remove(rating);

    // 책의 평점 업데이트
    await this.updateBookRating(bookId);
  }

  /**
   * 특정 사용자와 책에 대한 평점 조회
   */
  async findByUserAndBook(
    userId: number,
    bookId: number,
  ): Promise<RatingResponseDto | null> {
    try {
      if (!userId || !bookId) {
        this.logger.debug(
          `Invalid parameters: userId=${userId}, bookId=${bookId}`,
        );
        return null;
      }

      this.logger.debug(`Finding rating for user ${userId} and book ${bookId}`);
      const rating = await this.ratingRepository.findOne({
        where: { userId, bookId },
      });

      if (!rating) {
        this.logger.debug(
          `No rating found for user ${userId} and book ${bookId}`,
        );
        return null;
      }

      const result = this.mapToResponseDto(rating);
      this.logger.debug(`Found rating: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error finding rating for user ${userId} and book ${bookId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 특정 책에 대한 모든 평점 조회
   */
  async findAllByBook(bookId: number): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingRepository.find({
      where: { bookId },
      relations: ['user'],
    });

    return ratings.map((rating) => this.mapToResponseDto(rating));
  }

  /**
   * 특정 사용자의 모든 평점 조회
   */
  async findAllByUser(userId: number): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingRepository.find({
      where: { userId },
      relations: ['book'],
    });

    return ratings.map((rating) => this.mapToResponseDto(rating));
  }

  /**
   * 책의 평균 평점 업데이트
   */
  private async updateBookRating(bookId: number): Promise<void> {
    // 책에 대한 모든 별점 조회
    const ratings = await this.ratingRepository.find({
      where: { bookId },
      select: ['rating'],
    });

    if (ratings.length > 0) {
      // 평균 평점 계산
      const totalRating = ratings.reduce(
        (sum, item) => sum + Number(item.rating),
        0,
      );
      const avgRating = parseFloat((totalRating / ratings.length).toFixed(1));

      // 책 업데이트
      await this.bookRepository.update(bookId, {
        rating: avgRating,
        totalRatings: ratings.length,
      });
    } else {
      // 평점이 없는 경우 0으로 설정
      await this.bookRepository.update(bookId, {
        rating: 0,
        totalRatings: 0,
      });
    }
  }

  /**
   * Rating 엔티티를 RatingResponseDto로 변환
   */
  private mapToResponseDto(rating: Rating): RatingResponseDto {
    return {
      id: rating.id,
      userId: rating.userId,
      bookId: rating.bookId,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }

  /**
   * 특정 사용자의 평균 평점 계산
   */
  async getUserAverageRating(userId: number): Promise<number | null> {
    try {
      const result = await this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'averageRating')
        .where('rating.userId = :userId', { userId })
        .andWhere('rating.rating IS NOT NULL')
        .getRawOne();

      // 평점이 없으면 null 반환
      if (!result.averageRating) {
        return null;
      }

      // 소수점 1자리까지 반올림
      return Math.round(result.averageRating * 10) / 10;
    } catch (error) {
      this.logger.error(
        `유저 ${userId}의 평균 평점 계산 중 오류: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 특정 사용자의 평점 개수 조회
   */
  async getRatingCountByUser(userId: number): Promise<number> {
    try {
      const count = await this.ratingRepository.count({
        where: { userId },
      });
      return count;
    } catch (error) {
      this.logger.error(
        `유저 ${userId}의 평점 개수 조회 중 오류: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * 특정 사용자의 모든 평점 조회 (책 정보 포함)
   */
  async findAllByUserWithBookInfo(
    userId: number,
  ): Promise<RatingResponseDto[]> {
    try {
      const ratings = await this.ratingRepository.find({
        where: { userId },
        relations: ['book'],
        order: { createdAt: 'DESC' },
      });

      return await Promise.all(
        ratings.map(async (rating) => {
          const book = rating.book;

          return {
            ...this.mapToResponseDto(rating),
            book: book
              ? {
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  coverImage: book.coverImage,
                  isbn: book.isbn,
                  isbn13: book.isbn13,
                  publisher: book.publisher,
                  publishDate: book.publishDate,
                  description: book.description,
                  rating: book.rating,
                  reviews: book.reviews,
                  totalRatings: book.totalRatings,
                }
              : null,
          };
        }),
      );
    } catch (error) {
      this.logger.error(`유저 ${userId}의 평점 조회 중 오류: ${error.message}`);
      return [];
    }
  }
}
