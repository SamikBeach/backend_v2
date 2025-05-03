import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommonStatisticsService {
  private readonly logger = new Logger(CommonStatisticsService.name);

  // 데이터 병합 및 정렬 헬퍼 (중복 제거 포함)
  mergeAndSortData<T>(
    emptyData: T[],
    actualData: T[],
    key: string,
    limit: number,
  ): T[] {
    // 빈 데이터와 실제 데이터 맵 생성
    const dataMap: Record<string, T> = {};
    emptyData.forEach((item) => {
      dataMap[item[key]] = { ...item };
    });

    // 실제 데이터 병합
    actualData.forEach((item) => {
      if (dataMap[item[key]]) {
        dataMap[item[key]] = { ...dataMap[item[key]], ...item };
      } else {
        dataMap[item[key]] = { ...item };
      }
    });

    // 키 기준 정렬하고 최근 limit개만 반환
    return Object.values(dataMap)
      .sort((a, b) => (a[key] < b[key] ? -1 : 1))
      .slice(-limit);
  }

  // 날짜 포맷 헬퍼 (YYYY-MM-DD)
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 트렌드 계산 헬퍼 함수 (간단한 선형 기울기)
  calculateTrend(values: number[]): number {
    if (values.length <= 1) return 0;

    // 간단한 기울기 계산 (마지막 값 - 첫 값) / 개수
    return (values[values.length - 1] - values[0]) / values.length;
  }

  // 헬퍼 메서드: 비어있는 연도별 데이터 생성
  generateEmptyYearlyData(count = 5): {
    year: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const currentYear = new Date().getFullYear();
    const result = [];

    for (let i = 0; i < count; i++) {
      const year = currentYear - count + i + 1;
      result.push({
        year: year.toString(),
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    return result;
  }

  // 헬퍼 메서드: 비어있는 월별 데이터 생성
  generateEmptyMonthlyData(count = 5): {
    month: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const today = new Date();

    // 현재 년월 구하기
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based (0: 1월, 11: 12월)

    // 최근 count개월의 데이터 생성
    for (let i = 0; i < count; i++) {
      // count-i-1번째 이전 월 계산
      let targetMonth = currentMonth - (count - i - 1);
      let targetYear = currentYear;

      // 월이 음수인 경우 이전 연도로 조정
      while (targetMonth < 0) {
        targetYear--;
        targetMonth += 12;
      }

      // 월을 1부터 시작하는 형식으로 변환 (1월 = 1)
      const monthDisplay = String(targetMonth + 1).padStart(2, '0');

      result.push({
        month: `${targetYear}-${monthDisplay}`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    return result;
  }

  // 헬퍼 메서드: 비어있는 주간별 데이터 생성
  generateEmptyWeeklyData(): {
    week: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);

      const endMonth = endDate.getMonth() + 1;
      const weekIndex = Math.ceil(endDate.getDate() / 7);

      result.push({
        week: `${endMonth}월 ${weekIndex}째주`,
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 가장 오래된 주부터 표시하기 위해 역순으로 반환
    return result.reverse().slice(0, 5); // 항상 5개만 반환
  }

  // 헬퍼 메서드: 비어있는 일별 데이터 생성
  generateEmptyDailyData(): {
    date: string;
    wantToReadCount: number;
    readingCount: number;
    readCount: number;
  }[] {
    const result = [];
    const now = new Date();

    for (let i = 4; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      result.push({
        date: this.formatDate(date),
        wantToReadCount: 0,
        readingCount: 0,
        readCount: 0,
      });
    }

    // 항상 5개 반환
    return result;
  }

  // 주간 데이터 특별 병합 (특수한 형식의 주 정보 때문에)
  mergeWeeklyData<T extends { week: string }>(
    emptyData: T[],
    actualData: T[],
    limit: number,
  ): T[] {
    // 실제 데이터가 비어있으면 빈 데이터 반환
    if (actualData.length === 0) {
      return emptyData;
    }

    // 각 주차별 데이터를 객체로 변환
    const dataMap = new Map<string, T>();

    // 빈 데이터 먼저 맵에 등록
    emptyData.forEach((item) => {
      dataMap.set(item.week, { ...item });
    });

    // 실제 데이터로 업데이트
    actualData.forEach((item) => {
      dataMap.set(item.week, { ...dataMap.get(item.week), ...item });
    });

    // 맵을 배열로 변환하여 반환
    const result = Array.from(dataMap.values());

    // 주차 정보로 정렬 (최신 주 데이터가 먼저 오도록 역순 정렬)
    result.sort((a, b) => {
      const aMonth = parseInt(a.week.split('월')[0]);
      const bMonth = parseInt(b.week.split('월')[0]);

      if (aMonth !== bMonth) return bMonth - aMonth; // 월이 큰 것이 먼저 오도록

      const aWeek = parseInt(a.week.split('째주')[0].split('월 ')[1]);
      const bWeek = parseInt(b.week.split('째주')[0].split('월 ')[1]);

      return bWeek - aWeek; // 주차가 큰 것이 먼저 오도록
    });

    // 최대 limit 개수만 반환
    return result.slice(0, limit);
  }
}
