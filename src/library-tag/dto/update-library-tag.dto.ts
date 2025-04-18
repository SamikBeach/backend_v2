import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLibraryTagDto {
  @ApiProperty({ description: '태그 이름', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '태그 설명', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
