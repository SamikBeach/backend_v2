import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReadingStatus,
  ReadingStatusType,
} from './entities/reading-status.entity';
import {
  CreateReadingStatusDto,
  UpdateReadingStatusDto,
  ReadingStatusResponseDto,
  BookReadingStatusDto,
  BookInfoDto,
} from './dto/reading-status.dto';
import { Book } from '../book/entities/book.entity';
import { Not, IsNull } from 'typeorm';

@Injectable()
export class ReadingStatusService {
  private readonly logger = new Logger(ReadingStatusService.name);

  constructor(
    @InjectRepository(ReadingStatus)
    private readonly readingStatusRepository: Repository<ReadingStatus>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  /**
   * 읽기 상태 생성 또는 업데이트
   */
  async create(
    userId: number,
    bookId: number,
    createReadingStatusDto: CreateReadingStatusDto,
  ): Promise<ReadingStatusResponseDto> {
    try {
      // 책이 존재하는지 확인
      const book = await this.bookRepository.findOne({ where: { id: bookId } });
      if (!book) {
        this.logger.error(`Book with ID ${bookId} not found`);
        throw new NotFoundException('Book not found');
      }

      // 이미 존재하는 읽기 상태가 있는지 확인
      const existingStatus = await this.readingStatusRepository.findOne({
        where: { userId, bookId },
        relations: ['book'],
      });

      if (existingStatus) {
        // 이미 있다면 업데이트
        return this.update(existingStatus.id, createReadingStatusDto, userId);
      }

      // 새로운 읽기 상태 생성
      const readingStatus = this.readingStatusRepository.create({
        userId,
        bookId,
        ...createReadingStatusDto,
      });

      const savedStatus =
        await this.readingStatusRepository.save(readingStatus);

      // 저장 후 book 관계를 포함하여 데이터를 다시 로드
      const statusWithBook = await this.readingStatusRepository.findOne({
        where: { id: savedStatus.id },
        relations: ['book'],
      });

      if (!statusWithBook) {
        this.logger.error(
          `Failed to load saved status with ID: ${savedStatus.id}`,
        );
        throw new NotFoundException('Failed to retrieve saved reading status');
      }

      return this.mapToResponseDto(statusWithBook);
    } catch (error) {
      this.logger.error(`Error in create method: ${error.message}`);
      throw error;
    }
  }

  /**
   * 읽기 상태 업데이트
   */
  async update(
    id: number,
    updateReadingStatusDto: UpdateReadingStatusDto,
    userId: number,
  ): Promise<ReadingStatusResponseDto> {
    try {
      const readingStatus = await this.readingStatusRepository.findOne({
        where: { id },
        relations: ['user', 'book'],
      });

      if (!readingStatus) {
        this.logger.error(`Reading status not found with ID: ${id}`);
        throw new NotFoundException('Reading status not found');
      }

      // user 관계가 로드되지 않은 경우 userId로 직접 비교
      if (!readingStatus.user) {
        if (readingStatus.userId !== userId) {
          throw new UnauthorizedException(
            'You are not authorized to update this reading status',
          );
        }
      } else {
        // user 관계가 로드된 경우 정상 비교
        if (readingStatus.user.id !== userId) {
          throw new UnauthorizedException(
            'You are not authorized to update this reading status',
          );
        }
      }

      // 읽기 상태 업데이트
      Object.assign(readingStatus, updateReadingStatusDto);

      const updatedStatus =
        await this.readingStatusRepository.save(readingStatus);

      // 저장 후 book 관계를 포함하여 데이터를 다시 로드
      const statusWithBook = await this.readingStatusRepository.findOne({
        where: { id: updatedStatus.id },
        relations: ['book'],
      });

      if (!statusWithBook) {
        this.logger.error(
          `Failed to load updated status with ID: ${updatedStatus.id}`,
        );
        throw new NotFoundException(
          'Failed to retrieve updated reading status',
        );
      }

      return this.mapToResponseDto(statusWithBook);
    } catch (error) {
      this.logger.error(`Error in update method: ${error.message}`);
      throw error;
    }
  }

  /**
   * 읽기 상태 삭제
   */
  async delete(id: number, userId: number): Promise<void> {
    try {
      const readingStatus = await this.readingStatusRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!readingStatus) {
        this.logger.error(`Reading status not found with ID: ${id}`);
        throw new NotFoundException('Reading status not found');
      }

      // user 관계가 로드되지 않은 경우 userId로 직접 비교
      if (!readingStatus.user) {
        if (readingStatus.userId !== userId) {
          throw new UnauthorizedException(
            'You are not authorized to delete this reading status',
          );
        }
      } else {
        // user 관계가 로드된 경우 정상 비교
        if (readingStatus.user.id !== userId) {
          throw new UnauthorizedException(
            'You are not authorized to delete this reading status',
          );
        }
      }

      await this.readingStatusRepository.remove(readingStatus);
    } catch (error) {
      this.logger.error(`Error in delete method: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 사용자와 책에 대한 읽기 상태 조회
   */
  async findByUserAndBook(
    userId: number,
    bookId: number,
  ): Promise<ReadingStatusResponseDto | null> {
    try {
      // 읽기 상태 조회 - 기본 정보만 먼저 확인
      const status = await this.readingStatusRepository.findOne({
        where: { userId, bookId },
      });

      if (!status) {
        return null; // 읽기 상태가 없는 경우 null 반환
      }

      // 책 정보를 포함하여 다시 조회
      const statusWithBook = await this.readingStatusRepository.findOne({
        where: { id: status.id },
        relations: ['book'],
      });

      if (!statusWithBook?.book) {
        // 책 정보가 없는 경우, 책 정보만 별도로 조회
        const book = await this.bookRepository.findOne({
          where: { id: bookId },
        });

        if (book) {
          // 책 정보 직접 할당
          status.book = book;
        }
      } else {
        return this.mapToResponseDto(statusWithBook);
      }

      return this.mapToResponseDto(status);
    } catch (error) {
      this.logger.error(`Error finding reading status: ${error.message}`);
      return null; // 에러 발생 시에도 null 반환
    }
  }

  /**
   * 특정 사용자의 모든 읽기 상태 조회
   */
  async findAllByUser(userId: number): Promise<ReadingStatusResponseDto[]> {
    const statuses = await this.readingStatusRepository.find({
      where: { user: { id: userId } },
      relations: ['book'],
    });

    return statuses.map((status) => this.mapToResponseDto(status));
  }

  /**
   * 특정 사용자와 상태에 대한 읽기 상태 조회
   */
  async findByUserAndStatus(
    userId: number,
    status: ReadingStatusType | null,
  ): Promise<ReadingStatusResponseDto[]> {
    const whereCondition: any = { user: { id: userId } };

    if (status !== null) {
      whereCondition.status = status;
    } else {
      whereCondition.status = IsNull();
    }

    const statuses = await this.readingStatusRepository.find({
      where: whereCondition,
      relations: ['book'],
    });

    return statuses.map((status) => this.mapToResponseDto(status));
  }

  /**
   * 특정 책의 읽기 상태 통계
   */
  async getBookReadingStats(
    bookId: number,
    userId?: number,
  ): Promise<BookReadingStatusDto> {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // 책의 각 읽기 상태별 카운트 집계
    const counts = await this.readingStatusRepository
      .createQueryBuilder('status')
      .select('status.status', 'status')
      .addSelect('COUNT(status.id)', 'count')
      .where('status.bookId = :bookId', { bookId })
      .groupBy('status.status')
      .getRawMany();

    // 결과를 Record 객체로 변환
    const readingStatusCounts: Record<ReadingStatusType, number> = {
      [ReadingStatusType.WANT_TO_READ]: 0,
      [ReadingStatusType.READING]: 0,
      [ReadingStatusType.READ]: 0,
    };

    counts.forEach((item) => {
      readingStatusCounts[item.status] = parseInt(item.count);
    });

    // 사용자의 읽기 상태 가져오기 (로그인한 경우)
    let userReadingStatus: ReadingStatusType | undefined;

    if (userId) {
      const userStatus = await this.readingStatusRepository.findOne({
        where: { userId, bookId },
      });

      if (userStatus) {
        userReadingStatus = userStatus.status;
      }
    }

    // 현재 읽고 있는 사용자 수
    const currentReaders = readingStatusCounts[ReadingStatusType.READING];

    // 완독한 사용자 수
    const completedReaders = readingStatusCounts[ReadingStatusType.READ];

    // 평균 독서 기간 계산 (읽은 사용자들의 시작일과 완료일 차이 평균)
    let averageReadingTime = '데이터 없음';
    if (completedReaders > 0) {
      const completedReads = await this.readingStatusRepository.find({
        where: {
          bookId,
          status: ReadingStatusType.READ,
          startDate: Not(IsNull()),
          finishDate: Not(IsNull()),
        },
      });

      if (completedReads.length > 0) {
        // 각 사용자별 독서 기간(일)을 계산
        const readingDays = completedReads.map((read) => {
          const start = new Date(read.startDate);
          const finish = new Date(read.finishDate);
          const diffTime = Math.abs(finish.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays || 1; // 최소 1일
        });

        // 평균 독서 기간 계산
        const totalDays = readingDays.reduce((sum, days) => sum + days, 0);
        const avgDays = Math.round(totalDays / readingDays.length);
        averageReadingTime = `${avgDays}일`;
      }
    }

    // 책 난이도 결정 (완독한 독자들의 평균 독서 기간 기준)
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

    if (averageReadingTime !== '데이터 없음') {
      const days = parseInt(averageReadingTime);
      if (!isNaN(days)) {
        if (days <= 7) {
          difficulty = 'easy';
        } else if (days > 14) {
          difficulty = 'hard';
        }
      }
    }

    return {
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverImageUrl: book.coverImage,
      readingStatusCounts,
      userReadingStatus,
      currentReaders,
      completedReaders,
      averageReadingTime,
      difficulty,
    };
  }

  /**
   * 엔티티를 응답 DTO로 변환
   */
  private mapToResponseDto(
    readingStatus: ReadingStatus,
  ): ReadingStatusResponseDto {
    try {
      // book이 null인 경우 기본 정보 제공
      if (!readingStatus.book) {
        return {
          id: readingStatus.id,
          status: readingStatus.status,
          currentPage: readingStatus.currentPage,
          startDate: readingStatus.startDate,
          finishDate: readingStatus.finishDate,
          readingMemo: readingStatus.readingMemo,
          createdAt: readingStatus.createdAt,
          updatedAt: readingStatus.updatedAt,
          book: {
            id: readingStatus.bookId,
            title: '정보 없음',
            author: '정보 없음',
            coverImageUrl: '',
            isbn: '',
          },
        };
      }

      const bookInfo: BookInfoDto = {
        id: readingStatus.book.id,
        title: readingStatus.book.title,
        author: readingStatus.book.author,
        coverImageUrl: readingStatus.book.coverImage,
        isbn: readingStatus.book.isbn,
      };

      return {
        id: readingStatus.id,
        status: readingStatus.status,
        currentPage: readingStatus.currentPage,
        startDate: readingStatus.startDate,
        finishDate: readingStatus.finishDate,
        readingMemo: readingStatus.readingMemo,
        createdAt: readingStatus.createdAt,
        updatedAt: readingStatus.updatedAt,
        book: bookInfo,
      };
    } catch (error) {
      this.logger.error(`Error in mapToResponseDto: ${error.message}`);

      // 오류가 발생하더라도 최소한의 데이터 반환
      return {
        id: readingStatus.id,
        status: readingStatus.status,
        currentPage: readingStatus.currentPage,
        startDate: readingStatus.startDate,
        finishDate: readingStatus.finishDate,
        readingMemo: readingStatus.readingMemo,
        createdAt: readingStatus.createdAt,
        updatedAt: readingStatus.updatedAt,
        book: {
          id: readingStatus.bookId || 0,
          title: '오류 발생',
          author: '오류 발생',
          coverImageUrl: '',
          isbn: '',
        },
      };
    }
  }
}
