import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { Request } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @IsPublic()
  @ApiOperation({ summary: '피드백 제출' })
  @ApiResponse({
    status: 201,
    description: '피드백이 성공적으로 제출됨',
    type: FeedbackResponseDto,
  })
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @Req() req: Request,
    @GetUser() user?: User,
  ): Promise<FeedbackResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.feedbackService.create(
      createFeedbackDto,
      user,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 피드백 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.feedbackService.findAll(page, limit);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 피드백 조회' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id/resolve')
  @ApiBearerAuth()
  @ApiOperation({ summary: '피드백 해결 상태 업데이트' })
  async updateResolutionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isResolved') isResolved: boolean,
  ) {
    return this.feedbackService.updateResolutionStatus(id, isResolved);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '피드백 삭제' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.remove(id);
  }
}
