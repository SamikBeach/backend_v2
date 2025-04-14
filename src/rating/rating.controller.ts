import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import {
  CreateRatingDto,
  UpdateRatingDto,
  RatingResponseDto,
} from './dto/rating.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('rating')
@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post('book/:bookId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '책에 대한 평점 생성 또는 업데이트' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 201,
    description: '평점이 생성되었습니다.',
    type: RatingResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 404, description: '책을 찾을 수 없음' })
  async createOrUpdate(
    @Param('bookId') bookId: number,
    @Body() createRatingDto: CreateRatingDto,
    @GetUser() user: User,
  ): Promise<RatingResponseDto> {
    return this.ratingService.createOrUpdate(user.id, bookId, createRatingDto);
  }

  @Get('book/:bookId')
  @ApiOperation({ summary: '책에 대한 모든 평점 조회' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 200,
    description: '평점 목록 반환',
    type: [RatingResponseDto],
  })
  @ApiResponse({ status: 404, description: '책을 찾을 수 없음' })
  async findAllByBook(
    @Param('bookId') bookId: number,
  ): Promise<RatingResponseDto[]> {
    return this.ratingService.findAllByBook(bookId);
  }

  @Get('book/:bookId/user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 사용자의 책에 대한 평점 조회' })
  @ApiParam({ name: 'bookId', description: '책 ID' })
  @ApiResponse({
    status: 200,
    description: '평점 정보 반환',
    type: RatingResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 404, description: '평점을 찾을 수 없음' })
  async findByUserAndBook(
    @Param('bookId') bookId: number,
    @GetUser() user: User,
  ): Promise<RatingResponseDto> {
    const rating = await this.ratingService.findByUserAndBook(user.id, bookId);
    if (!rating) {
      throw new NotFoundException('평점을 찾을 수 없습니다.');
    }
    return rating;
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자의 모든 평점 조회' })
  @ApiResponse({
    status: 200,
    description: '평점 목록 반환',
    type: [RatingResponseDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  async findAllByUser(@GetUser() user: User): Promise<RatingResponseDto[]> {
    return this.ratingService.findAllByUser(user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '평점 업데이트' })
  @ApiParam({ name: 'id', description: '평점 ID' })
  @ApiResponse({
    status: 200,
    description: '평점이 업데이트되었습니다.',
    type: RatingResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '평점을 찾을 수 없음' })
  async update(
    @Param('id') id: number,
    @Body() updateRatingDto: UpdateRatingDto,
    @GetUser() user: User,
  ): Promise<RatingResponseDto> {
    return this.ratingService.update(id, updateRatingDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '평점 삭제' })
  @ApiParam({ name: 'id', description: '평점 ID' })
  @ApiResponse({ status: 204, description: '평점이 삭제되었습니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '평점을 찾을 수 없음' })
  async remove(@Param('id') id: number, @GetUser() user: User): Promise<void> {
    return this.ratingService.delete(id, user.id);
  }
}
