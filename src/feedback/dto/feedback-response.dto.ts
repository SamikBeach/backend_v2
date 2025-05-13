import { ApiProperty } from '@nestjs/swagger';

export class FeedbackResponseDto {
  @ApiProperty({
    description: '피드백 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '피드백 내용',
    example: '앱 사용 중 검색 기능이 느려요. 개선해주세요.',
  })
  content: string;

  @ApiProperty({
    description: '이메일 (제공된 경우)',
    example: 'user@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: '피드백 생성 시간',
    example: '2023-09-15T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '성공 메시지',
    example: '피드백이 성공적으로 제출되었습니다. 감사합니다!',
  })
  message: string;
}
