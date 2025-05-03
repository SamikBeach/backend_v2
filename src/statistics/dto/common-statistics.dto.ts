import { ApiProperty } from '@nestjs/swagger';

// 사용자의 독서 시간 패턴 통계 응답 DTO
export class ReadingTimePatternResponseDto {
  @ApiProperty({
    description: '하루 중 독서를 가장 많이 하는 시간대',
    example: ['아침 (6-9시)', '저녁 (18-21시)'],
  })
  peakReadingHours: string[];

  @ApiProperty({
    description: '주간 평균 독서 시간 (시간)',
    example: 7.5,
  })
  weeklyAverageReadingHours: number;

  @ApiProperty({
    description: '월간 평균 독서 시간 (시간)',
    example: 30,
  })
  monthlyAverageReadingHours: number;

  @ApiProperty({
    description: '독서 지속 시간 분석 (한 번에 읽는 평균 시간)',
    example: '45분',
  })
  averageSessionDuration: string;

  @ApiProperty({
    description: '요일별 독서 시간 분포',
    example: [
      { day: '월요일', hours: 1.2 },
      { day: '화요일', hours: 0.8 },
      { day: '수요일', hours: 1.5 },
      { day: '목요일', hours: 0.9 },
      { day: '금요일', hours: 0.7 },
      { day: '토요일', hours: 1.8 },
      { day: '일요일', hours: 2.1 },
    ],
  })
  dayOfWeekDistribution: { day: string; hours: number }[];

  @ApiProperty({
    description: '계절별 독서 시간 분포',
    example: [
      { season: '봄', hours: 35 },
      { season: '여름', hours: 28 },
      { season: '가을', hours: 42 },
      { season: '겨울', hours: 45 },
    ],
  })
  seasonalDistribution: { season: string; hours: number }[];

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;
}
