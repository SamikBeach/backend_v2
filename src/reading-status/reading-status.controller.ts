import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { ReadingStatusService } from './reading-status.service';
import {
  CreateReadingStatusDto,
  UpdateReadingStatusDto,
  ReadingStatusResponseDto,
  BookReadingStatusDto,
} from './dto/reading-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReadingStatusType } from './entities/reading-status.entity';

@ApiTags('reading-status')
@Controller('reading-status')
export class ReadingStatusController {
  private readonly logger = new Logger(ReadingStatusController.name);

  constructor(private readonly readingStatusService: ReadingStatusService) {}

  @Post('book/:bookId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '읽기 상태 생성' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 201,
    description: '읽기 상태 생성 성공',
    type: ReadingStatusResponseDto,
  })
  async create(
    @Param('bookId') bookId: number,
    @Body() createReadingStatusDto: CreateReadingStatusDto,
    @GetUser() user: User,
  ): Promise<ReadingStatusResponseDto> {
    try {
      // user 객체 검증
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      return await this.readingStatusService.create(
        user.id,
        +bookId,
        createReadingStatusDto,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자의 모든 읽기 상태 조회' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReadingStatusType,
    description: '읽기 상태로 필터링',
  })
  @ApiResponse({
    status: 200,
    description: '사용자의 모든 읽기 상태 조회 성공',
    type: [ReadingStatusResponseDto],
  })
  findAllByUser(
    @GetUser() user: User,
    @Query('status') status?: string,
  ): Promise<ReadingStatusResponseDto[]> {
    if (status === 'null') {
      return this.readingStatusService.findByUserAndStatus(user.id, null);
    } else if (
      status &&
      Object.values(ReadingStatusType).includes(status as ReadingStatusType)
    ) {
      return this.readingStatusService.findByUserAndStatus(
        user.id,
        status as ReadingStatusType,
      );
    }
    return this.readingStatusService.findAllByUser(user.id);
  }

  @Get('book/:bookId')
  @ApiOperation({ summary: '책의 읽기 상태 통계 조회' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 200,
    description: '책의 읽기 상태 통계 조회 성공',
    type: BookReadingStatusDto,
  })
  async getBookReadingStats(
    @Param('bookId') bookId: number,
    @GetUser() user?: User,
  ): Promise<BookReadingStatusDto> {
    try {
      return await this.readingStatusService.getBookReadingStats(
        +bookId,
        user?.id,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('book/:bookId/user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 책에 대한 사용자의 읽기 상태 조회' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 200,
    description: '읽기 상태 조회 성공',
    type: ReadingStatusResponseDto,
  })
  async findByUserAndBook(
    @Param('bookId') bookId: number,
    @GetUser() user: User,
  ) {
    const result = await this.readingStatusService.findByUserAndBook(
      user.id,
      +bookId,
    );
    // 데이터가 없으면 빈 객체 반환
    return result || {};
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '읽기 상태 업데이트' })
  @ApiParam({ name: 'id', description: '읽기 상태 ID' })
  @ApiResponse({
    status: 200,
    description: '읽기 상태 업데이트 성공',
    type: ReadingStatusResponseDto,
  })
  update(
    @Param('id') id: number,
    @Body() updateReadingStatusDto: UpdateReadingStatusDto,
    @GetUser() user: User,
  ): Promise<ReadingStatusResponseDto> {
    return this.readingStatusService.update(
      +id,
      updateReadingStatusDto,
      user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '읽기 상태 삭제' })
  @ApiParam({ name: 'id', description: '읽기 상태 ID' })
  @ApiResponse({
    status: 200,
    description: '읽기 상태 삭제 성공',
  })
  remove(@Param('id') id: number, @GetUser() user: User): Promise<void> {
    return this.readingStatusService.delete(+id, user.id);
  }
}
