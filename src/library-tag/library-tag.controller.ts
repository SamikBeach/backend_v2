import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { LibraryTagService } from './library-tag.service';
import { LibraryTagResponseDto } from './dto/library-tag-response.dto';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateLibraryTagDto } from './dto/update-library-tag.dto';
import { MergeLibraryTagsDto } from './dto/merge-library-tags.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('library-tag')
@Controller('library-tag')
export class LibraryTagController {
  constructor(private readonly libraryTagService: LibraryTagService) {}

  @Get()
  @IsPublic()
  @ApiOperation({ summary: 'Find all library tags' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of library tags',
  })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.libraryTagService.findAll({
      page: page || 1,
      limit: limit || 10,
    });
  }

  @Get('popular')
  @IsPublic()
  @ApiOperation({ summary: 'Find popular library tags' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of popular library tags',
  })
  async findPopularTags(
    @Query('limit') limit?: number,
  ): Promise<LibraryTagResponseDto[]> {
    return this.libraryTagService.findPopularTags(limit);
  }

  @Get(':id')
  @IsPublic()
  @ApiOperation({ summary: 'Find one library tag by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns a library tag',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LibraryTagResponseDto> {
    const tag = await this.libraryTagService.findOne(id);
    return {
      id: tag.id,
      tagName: tag.name,
      description: tag.description,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a library tag' })
  @ApiResponse({
    status: 200,
    description: 'Returns an updated library tag',
  })
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLibraryTagDto: UpdateLibraryTagDto,
  ): Promise<LibraryTagResponseDto> {
    return this.libraryTagService.update(
      id,
      updateLibraryTagDto.name,
      updateLibraryTagDto.description,
    );
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge two library tags' })
  @ApiResponse({
    status: 200,
    description: 'Returns a success message',
  })
  @UseGuards(JwtAuthGuard)
  async mergeTags(
    @Body() mergeTagsDto: MergeLibraryTagsDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.libraryTagService.mergeTags(
      mergeTagsDto.sourceTagId,
      mergeTagsDto.targetTagId,
    );
    return {
      success: true,
      message: '태그가 성공적으로 병합되었습니다.',
    };
  }
}
