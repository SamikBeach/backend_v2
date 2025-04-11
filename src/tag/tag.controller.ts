import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { TagService } from './tag.service';
import {
  TagResponseDto,
  TagListResponseDto,
} from '../library/dto/tag-response.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @IsPublic()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<TagListResponseDto> {
    return this.tagService.findAll(page, limit, search);
  }

  @Get('popular')
  @IsPublic()
  async findPopularTags(
    @Query('limit') limit?: number,
  ): Promise<TagResponseDto[]> {
    return this.tagService.findPopularTags(limit);
  }

  @Get(':id')
  @IsPublic()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TagResponseDto> {
    const tag = await this.tagService.findOne(id);
    return {
      id: tag.id,
      name: tag.name,
      description: tag.description,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name?: string,
    @Body('description') description?: string,
  ): Promise<TagResponseDto> {
    return this.tagService.update(id, name, description);
  }

  @Post('merge')
  async mergeTags(
    @Body('sourceTagId', ParseIntPipe) sourceTagId: number,
    @Body('targetTagId', ParseIntPipe) targetTagId: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.tagService.mergeTags(sourceTagId, targetTagId);
    return {
      success: true,
      message: '태그가 성공적으로 병합되었습니다.',
    };
  }
}
