import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * YouTube 동영상 검색 결과
 */
export interface YouTubeVideoResult {
  /** 동영상 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 썸네일 URL */
  thumbnailUrl: string;
  /** 게시일 */
  publishedAt: string;
  /** 채널명 */
  channelTitle: string;
}

/**
 * YouTube API를 사용한 책 관련 동영상 검색 서비스
 */
@Injectable()
export class YouTubeService {
  private readonly youtube: youtube_v3.Youtube;
  private readonly logger = new Logger(YouTubeService.name);
  private readonly cacheTTL = 86400; // 24시간 (초 단위)

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * YouTube 동영상 검색 (캐시 지원)
   *
   * @param {string} query - 검색어
   * @param {number} [maxResults=5] - 최대 결과 수
   * @returns {Promise<YouTubeVideoResult[]>} 검색 결과
   */
  async searchVideos(
    query: string,
    maxResults: number = 5,
  ): Promise<YouTubeVideoResult[]> {
    const cacheKey = `youtube_search_${query}_${maxResults}`;

    this.logger.log(
      `YouTube API 검색 시작: query="${query}", maxResults=${maxResults}`,
    );

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 YouTube 검색 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 캐시에 데이터가 없으면 API 호출
    this.logger.log(`YouTube API 호출 시작: ${query}`);
    try {
      const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
      this.logger.log(`YouTube API Key 존재 여부: ${!!apiKey}`);
      this.logger.log(`YouTube API Key 길이: ${apiKey?.length || 0}`);
      this.logger.log(
        `YouTube API Key 앞 10자리: ${apiKey?.substring(0, 10) || 'N/A'}...`,
      );

      if (!apiKey) {
        this.logger.error('YouTube API Key가 설정되지 않았습니다.');
        return [];
      }

      this.logger.log('YouTube API 요청 파라미터:', {
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
        regionCode: 'KR',
        safeSearch: 'moderate',
        order: 'relevance',
      });

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
        regionCode: 'KR',
        safeSearch: 'moderate',
        order: 'relevance',
      });

      this.logger.log(`YouTube API 응답 상태: ${response.status}`);
      this.logger.log(
        `YouTube API 응답 아이템 수: ${response.data.items?.length || 0}`,
      );

      if (response.data.items && response.data.items.length > 0) {
        this.logger.log('첫 번째 아이템 원본 데이터:', {
          id: response.data.items[0].id,
          snippet: {
            title: response.data.items[0].snippet?.title,
            description: response.data.items[0].snippet?.description?.substring(
              0,
              100,
            ),
            channelTitle: response.data.items[0].snippet?.channelTitle,
            publishedAt: response.data.items[0].snippet?.publishedAt,
          },
        });
      }

      const results: YouTubeVideoResult[] =
        response.data.items?.map((item) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
          publishedAt: item.snippet?.publishedAt,
          channelTitle: item.snippet?.channelTitle,
        })) || [];

      this.logger.log(`변환된 결과 수: ${results.length}`);

      // 첫 번째 결과 샘플 로그
      if (results.length > 0) {
        this.logger.log(`첫 번째 결과 샘플:`, {
          id: results[0].id,
          title: results[0].title?.substring(0, 50) + '...',
          channelTitle: results[0].channelTitle,
        });
      }

      // 결과를 캐시에 저장 (빈 결과도 저장하여 불필요한 API 호출 방지)
      await this.cacheManager.set(cacheKey, results, this.cacheTTL);
      this.logger.log(`결과를 캐시에 저장: ${cacheKey} (${results.length}개)`);

      return results;
    } catch (error) {
      this.logger.error('YouTube API 오류:', error.message);
      this.logger.error('YouTube API 오류 상세:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // 할당량 초과 여부 확인
      if (
        error.code === 403 ||
        (error.response && error.response.status === 403)
      ) {
        this.logger.error('YouTube API 할당량 초과 가능성:', {
          code: error.code,
          status: error.response?.status,
          reason: error.response?.data?.error?.errors?.[0]?.reason,
        });
      }

      return [];
    }
  }

  /**
   * 작가명으로 YouTube 동영상 검색
   *
   * @param {Object} options - 검색 옵션
   * @param {string} options.authorName - 작가 이름
   * @param {number} [options.maxResults=15] - 최대 결과 수 (기본값 증가)
   * @returns {Promise<YouTubeVideoResult[]>} 검색 결과
   */
  async searchAuthorVideos(options: {
    authorName: string;
    maxResults?: number;
  }): Promise<YouTubeVideoResult[]> {
    const { authorName, maxResults = 15 } = options; // 기본값을 15로 증가
    const cleanAuthor = this.cleanSearchText(authorName);
    const cacheKey = `youtube_author_${cleanAuthor}_${maxResults}`;

    this.logger.log(
      `작가 YouTube 검색 시작: "${authorName}" -> "${cleanAuthor}"`,
    );

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 작가 동영상 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 더 유연한 작가 검색어 조합 생성
    const searchQueries = this.generateFlexibleAuthorSearchQueries(cleanAuthor);
    this.logger.log(
      `생성된 작가 검색어 조합 (${searchQueries.length}개):`,
      searchQueries,
    );

    let allResults: YouTubeVideoResult[] = [];
    const seenVideoIds = new Set<string>();

    // 각 검색어로 검색하여 결과 병합 (중복 제거)
    for (
      let i = 0;
      i < searchQueries.length && allResults.length < maxResults;
      i++
    ) {
      const query = searchQueries[i];
      this.logger.log(
        `작가 검색 시도 ${i + 1}/${searchQueries.length}: "${query}"`,
      );

      // 각 검색어마다 적은 수의 결과를 가져와서 다양성 확보
      const searchLimit = Math.min(
        8,
        Math.ceil(maxResults / searchQueries.length) + 2,
      );
      const results = await this.searchVideos(query, searchLimit);

      if (results.length > 0) {
        this.logger.log(`작가 검색 성공: ${results.length}개 결과 발견`);

        // 중복 제거하면서 결과 추가
        for (const result of results) {
          if (
            result.id &&
            !seenVideoIds.has(result.id) &&
            allResults.length < maxResults
          ) {
            seenVideoIds.add(result.id);
            allResults.push(result);
          }
        }
      } else {
        this.logger.log(`작가 검색 결과 없음`);
      }
    }

    this.logger.log(
      `작가 검색 최종 결과: ${allResults.length}개 영상 (중복 제거됨)`,
    );

    // 결과를 캐시에 저장
    await this.cacheManager.set(cacheKey, allResults, this.cacheTTL);
    this.logger.log(
      `작가 검색 결과를 캐시에 저장: ${cacheKey} (${allResults.length}개)`,
    );

    return allResults;
  }

  /**
   * 더 유연한 작가 검색어 조합 생성 (단순하고 포괄적)
   *
   * @param {string} authorName - 정제된 작가명
   * @returns {string[]} 검색어 배열 (우선순위 순)
   */
  private generateFlexibleAuthorSearchQueries(authorName: string): string[] {
    const queries: string[] = [];

    if (!authorName) return queries;

    // 1순위: 작가명만 (가장 포괄적)
    queries.push(authorName);

    // 2순위: 작가명 + 간단한 키워드
    queries.push(`${authorName} 작가`);
    queries.push(`${authorName} 책`);

    // 3순위: 작가명 + 기타 키워드
    queries.push(`${authorName} 인터뷰`);
    queries.push(`${authorName} 소설`);

    // 중복 제거 및 빈 문자열 제거
    return [...new Set(queries)].filter((q) => q.trim().length > 0);
  }

  /**
   * 검색어 정제 함수
   *
   * @param {string} text - 정제할 텍스트
   * @returns {string} 정제된 텍스트
   */
  private cleanSearchText(text: string): string {
    if (!text) return '';

    return (
      text
        // (지은이), (옮긴이), (그림), (글) 등 제거
        .replace(/\s*\([^)]*이\)\s*/g, ' ')
        .replace(/\s*\([^)]*글\)\s*/g, ' ')
        .replace(/\s*\([^)]*그림\)\s*/g, ' ')
        // 특수문자 정리 (ㅇ, ㅋ 등)
        .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, '')
        // 연속된 공백을 하나로
        .replace(/\s+/g, ' ')
        // 앞뒤 공백 제거
        .trim()
    );
  }

  /**
   * 책 정보로 YouTube 동영상 검색
   *
   * @param {Object} options - 검색 옵션
   * @param {string} options.bookTitle - 책 제목
   * @param {number} [options.maxResults=15] - 최대 결과 수 (기본값 더 증가)
   * @param {string} [options.authorName] - 작가 이름
   * @param {string} [options.publisher] - 출판사
   * @returns {Promise<YouTubeVideoResult[]>} 검색 결과
   */
  async searchBookVideos(options: {
    bookTitle: string;
    maxResults?: number;
    authorName?: string;
    publisher?: string;
  }): Promise<YouTubeVideoResult[]> {
    const { bookTitle, authorName, publisher, maxResults = 15 } = options; // 기본값을 15로 더 증가

    // 검색어 정제
    const cleanTitle = this.cleanSearchText(bookTitle);
    const cleanAuthor = this.cleanSearchText(authorName || '');
    const cleanPublisher = this.cleanSearchText(publisher || '');

    const cacheKey = `youtube_book_${cleanTitle}_${cleanAuthor || '없음'}_${cleanPublisher || '없음'}_${maxResults}`;

    this.logger.log(`책 YouTube 검색 시작:`, {
      원본: { bookTitle, authorName, publisher },
      정제후: { cleanTitle, cleanAuthor, cleanPublisher },
      maxResults,
    });

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 책 동영상 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 더 유연한 검색어 조합 생성
    const searchQueries = this.generateFlexibleBookSearchQueries(
      cleanTitle,
      cleanAuthor,
    );

    this.logger.log(
      `생성된 검색어 조합 (${searchQueries.length}개):`,
      searchQueries,
    );

    let allResults: YouTubeVideoResult[] = [];
    const seenVideoIds = new Set<string>();

    // 각 검색어로 검색하여 결과 병합 (중복 제거)
    for (
      let i = 0;
      i < searchQueries.length && allResults.length < maxResults;
      i++
    ) {
      const query = searchQueries[i];
      this.logger.log(`검색 시도 ${i + 1}/${searchQueries.length}: "${query}"`);

      // 각 검색어마다 적은 수의 결과를 가져와서 다양성 확보
      const searchLimit = Math.min(
        8,
        Math.ceil(maxResults / searchQueries.length) + 2,
      );
      const results = await this.searchVideos(query, searchLimit);

      if (results.length > 0) {
        this.logger.log(`검색 성공: ${results.length}개 결과 발견`);

        // 중복 제거하면서 결과 추가
        for (const result of results) {
          if (
            result.id &&
            !seenVideoIds.has(result.id) &&
            allResults.length < maxResults
          ) {
            seenVideoIds.add(result.id);
            allResults.push(result);
          }
        }
      } else {
        this.logger.log(`검색 결과 없음`);
      }
    }

    this.logger.log(
      `최종 검색 결과: ${allResults.length}개 영상 (중복 제거됨)`,
    );

    // 결과를 캐시에 저장
    await this.cacheManager.set(cacheKey, allResults, this.cacheTTL);
    this.logger.log(
      `검색 결과를 캐시에 저장: ${cacheKey} (${allResults.length}개)`,
    );

    return allResults;
  }

  /**
   * 더 유연한 책 검색어 조합 생성 (단순하고 포괄적)
   *
   * @param {string} title - 정제된 책 제목
   * @param {string} author - 정제된 작가명
   * @returns {string[]} 검색어 배열 (우선순위 순)
   */
  private generateFlexibleBookSearchQueries(
    title: string,
    author: string,
  ): string[] {
    const queries: string[] = [];

    if (!title) return queries;

    // 1순위: 제목만 (가장 포괄적)
    queries.push(title);

    // 2순위: 제목 + 간단한 키워드
    queries.push(`${title} 책`);
    queries.push(`${title} 리뷰`);

    // 3순위: 작가가 있는 경우
    if (author) {
      queries.push(`${title} ${author}`);
      queries.push(`${author} ${title}`);
      queries.push(author);
    }

    // 4순위: 제목의 일부분 (긴 제목의 경우)
    if (title.length > 8) {
      const titleParts = title.split(' ');
      if (titleParts.length > 1) {
        // 첫 번째 단어만
        queries.push(titleParts[0]);
        // 처음 두 단어 (두 단어 이상인 경우)
        if (titleParts.length > 2) {
          queries.push(`${titleParts[0]} ${titleParts[1]}`);
        }
      }
    }

    // 중복 제거 및 빈 문자열 제거
    return [...new Set(queries)].filter((q) => q.trim().length > 0);
  }
}
