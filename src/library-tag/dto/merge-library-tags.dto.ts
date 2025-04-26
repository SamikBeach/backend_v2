import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class MergeLibraryTagsDto {
  @ApiProperty({ description: '병합할 소스 태그 ID' })
  @IsInt()
  @IsNotEmpty()
  sourceTagId: number;

  @ApiProperty({ description: '병합 대상 태그 ID' })
  @IsInt()
  @IsNotEmpty()
  targetTagId: number;
}
