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
        relevanceLanguage: 'ko',
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
      });

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
        relevanceLanguage: 'ko',
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
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

      // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
      if (results.length > 0) {
        await this.cacheManager.set(cacheKey, results, this.cacheTTL);
        this.logger.log(`결과를 캐시에 저장: ${cacheKey}`);
      }

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
   * @param {number} [options.maxResults=5] - 최대 결과 수
   * @returns {Promise<YouTubeVideoResult[]>} 검색 결과
   */
  async searchAuthorVideos(options: {
    authorName: string;
    maxResults?: number;
  }): Promise<YouTubeVideoResult[]> {
    const { authorName, maxResults = 5 } = options;
    const cacheKey = `youtube_author_${authorName}_${maxResults}`;

    // 캐시에서 데이터 확인
    const cachedData =
      await this.cacheManager.get<YouTubeVideoResult[]>(cacheKey);
    if (cachedData) {
      this.logger.log(
        `캐시에서 작가 동영상 결과 반환 (24시간 유효): ${cacheKey}`,
      );
      return cachedData;
    }

    // 캐시에 데이터가 없으면 검색 실행YouTube API 호출
    this.logger.log(`작가 : ${authorName}`);
    const query = `${authorName}`;
    const results = await this.searchVideos(query, maxResults);

    // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
    if (results.length > 0) {
      await this.cacheManager.set(cacheKey, results, this.cacheTTL);
    }

    return results;
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
   * @param {number} [options.maxResults=5] - 최대 결과 수
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
    const { bookTitle, authorName, publisher, maxResults = 5 } = options;

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

    // 캐시에 데이터가 없으면 검색 실행
    this.logger.log(`책 YouTube API 호출: ${cleanTitle}`);
    let query = cleanTitle;
    if (cleanAuthor) {
      query += ` ${cleanAuthor}`;
    }
    // 출판사는 검색 정확도를 떨어뜨릴 수 있으므로 제외
    // if (cleanPublisher) {
    //   query += ` ${cleanPublisher}`;
    // }

    this.logger.log(`최종 검색 쿼리: "${query}"`);

    const results = await this.searchVideos(query, maxResults);

    this.logger.log(`검색 결과: ${results.length}개 영상`);

    // 검색 결과가 없으면 대체 검색어로 재시도
    let finalResults = results;
    if (results.length === 0) {
      this.logger.log('검색 결과가 없어 대체 검색어로 재시도합니다.');
      
      // 1차 대체: 제목만으로 검색
      if (cleanTitle) {
        this.logger.log(`대체 검색 1차: 제목만 - "${cleanTitle}"`);
        finalResults = await this.searchVideos(cleanTitle, maxResults);
      }
      
      // 2차 대체: 작가명만으로 검색 (제목 검색도 실패한 경우)
      if (finalResults.length === 0 && cleanAuthor) {
        this.logger.log(`대체 검색 2차: 작가명만 - "${cleanAuthor}"`);
        finalResults = await this.searchVideos(cleanAuthor, maxResults);
      }
      
      // 3차 대체: 장르 관련 검색 (만화, 웹툰 등)
      if (finalResults.length === 0) {
        this.logger.log('대체 검색 3차: 장르 관련 검색 - "웹툰 리뷰"');
        finalResults = await this.searchVideos('웹툰 리뷰', maxResults);
      }
      
      this.logger.log(`대체 검색 최종 결과: ${finalResults.length}개 영상`);
    }

    // 결과를 캐시에 저장 (빈 결과는 저장하지 않음)
    if (finalResults.length > 0) {
      await this.cacheManager.set(cacheKey, finalResults, this.cacheTTL);
      this.logger.log(`검색 결과를 캐시에 저장: ${cacheKey}`);
    } else {
      this.logger.warn(`검색 결과가 없어 캐시에 저장하지 않음`);
    }

    return finalResults;
  }
}
