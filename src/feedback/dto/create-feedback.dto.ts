import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({
    description: '피드백 내용',
    example: '앱 사용 중 검색 기능이 느려요. 개선해주세요.',
  })
  @IsString()
  content: string;
}
