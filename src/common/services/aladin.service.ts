import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * 알라딘 API 결과 타입
 */
export interface AladinApiResult {
  version: string;
  title: string;
  link: string;
  pubDate: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
  searchCategoryId?: number;
  searchCategoryName?: string;
  item: AladinBook[];
}

/**
 * 알라딘 도서 정보 타입
 */
export interface AladinBook {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  description: string;
  isbn: string;
  isbn13: string;
  priceSales: number;
  priceStandard: number;
  mallType: string;
  stockStatus: string;
  mileage: number;
  cover: string;
  publisher: string;
  salesPoint: number;
  adult: boolean;
  fixedPrice: boolean;
  customerReviewRank: number;
  seriesInfo?: {
    seriesId: number;
    seriesLink: string;
    seriesName: string;
  };
  subInfo?: {
    ebookList?: any[];
    usedList?: any;
    fileFormatList?: any[];
    categoryIdList?: any;
    toc?: string;
    fullDescription?: string;
    fullDescription2?: string;
    reviewList?: any[];
    authors?: any[];
  };
  [key: string]: any;
}

export type AladinCover = 'Big' | 'MidBig' | 'Mid' | 'Small' | 'Mini' | 'None';
export type AladinQueryType = 'Keyword' | 'Title' | 'Author' | 'Publisher';
export type AladinSort =
  | 'Accuracy'
  | 'PublishTime'
  | 'Title'
  | 'SalesPoint'
  | 'CustomerRating';
export type AladinSearchTarget =
  | 'Book'
  | 'Foreign'
  | 'Music'
  | 'DVD'
  | 'Used'
  | 'eBook'
  | 'All';
export type AladinOutputType = 'js' | 'xml';
export type AladinItemIdType = 'ISBN' | 'ISBN13' | 'ItemId';
export type AladinListQueryType =
  | 'ItemNewAll'
  | 'ItemNewSpecial'
  | 'ItemEditorChoice'
  | 'Bestseller'
  | 'BlogBest';

/**
 * 도서 검색 파라미터
 */
export interface AladinBookSearchParams {
  query?: string;
  queryType?: AladinQueryType;
  start?: number;
  maxResults?: number;
  sort?: AladinSort;
  cover?: AladinCover;
  categoryId?: number;
  searchTarget?: AladinSearchTarget;
  output?: AladinOutputType;
  version?: string;
  outofStockfilter?: number;
  inputEncoding?: string;
  includeKey?: number;
  partner?: string;
  recentPublishFilter?: number;
  optResult?: string[];
}

/**
 * 도서 리스트 파라미터
 */
export interface AladinBookListParams {
  queryType: AladinListQueryType;
  start?: number;
  maxResults?: number;
  cover?: AladinCover;
  categoryId?: number;
  searchTarget?: AladinSearchTarget;
  output?: AladinOutputType;
  version?: string;
  outofStockfilter?: number;
  includeKey?: number;
  partner?: string;
  year?: number;
  month?: number;
  week?: number;
  optResult?: string[];
}

/**
 * 도서 상세 파라미터
 */
export interface AladinBookDetailParams {
  itemId: string;
  itemIdType?: AladinItemIdType;
  cover?: AladinCover;
  output?: AladinOutputType;
  version?: string;
  includeKey?: number;
  partner?: string;
  optResult?: string[];
  offCode?: string;
}

/**
 * 중고 매장 도서 검색 파라미터
 */
export interface AladinOffStoreListParams {
  itemId: string;
  itemIdType?: AladinItemIdType;
  output?: AladinOutputType;
  version?: string;
}

@Injectable()
export class AladinService {
  private readonly logger = new Logger(AladinService.name);
  private readonly ttbKey: string;
  private readonly baseSearchUrl =
    'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';
  private readonly baseListUrl =
    'http://www.aladin.co.kr/ttb/api/ItemList.aspx';
  private readonly baseDetailUrl =
    'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
  private readonly baseOffStoreListUrl =
    'http://www.aladin.co.kr/ttb/api/ItemOffStoreList.aspx';
  private readonly defaultVersion = '20131101';

  constructor(private readonly configService: ConfigService) {
    this.ttbKey = this.configService.get<string>('ALADIN_API_KEY');
    if (!this.ttbKey) {
      this.logger.error('알라딘 API 키가 설정되지 않았습니다!');
    }
  }

  /**
   * 알라딘 API를 통해 도서를 검색합니다.
   */
  async searchBooks(params: AladinBookSearchParams): Promise<AladinApiResult> {
    try {
      const response = await axios.get(this.baseSearchUrl, {
        params: {
          ttbkey: this.ttbKey,
          Query: params.query || '',
          QueryType: params.queryType || 'Keyword',
          MaxResults: params.maxResults || 10,
          start: params.start || 1,
          SearchTarget: params.searchTarget || 'Book',
          output: params.output || 'js',
          Version: params.version || this.defaultVersion,
          Cover: params.cover || 'Big',
          CategoryId: params.categoryId || 0,
          Sort: params.sort || 'Accuracy',
          outofStockfilter: params.outofStockfilter || 0,
          RecentPublishFilter: params.recentPublishFilter || 0,
          includeKey: params.includeKey || 0,
          OptResult: params.optResult ? params.optResult.join(',') : undefined,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`도서 검색 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 알라딘 API를 통해 도서 리스트를 가져옵니다. (신간, 베스트셀러 등)
   */
  async getBookList(params: AladinBookListParams): Promise<AladinApiResult> {
    try {
      const queryParams: any = {
        ttbkey: this.ttbKey,
        QueryType: params.queryType,
        MaxResults: params.maxResults || 10,
        start: params.start || 1,
        SearchTarget: params.searchTarget || 'Book',
        output: params.output || 'js',
        Version: params.version || this.defaultVersion,
        Cover: params.cover || 'Big',
        CategoryId: params.categoryId || 0,
        outofStockfilter: params.outofStockfilter || 0,
        includeKey: params.includeKey || 0,
        OptResult: params.optResult ? params.optResult.join(',') : undefined,
      };

      // 베스트셀러 조회 시 년/월/주 파라미터 추가
      if (params.queryType === 'Bestseller' && params.year && params.month) {
        queryParams.Year = params.year;
        queryParams.Month = params.month;
        if (params.week) {
          queryParams.Week = params.week;
        }
      }

      const response = await axios.get(this.baseListUrl, {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`도서 리스트 조회 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 알라딘 API를 통해 도서 상세 정보를 가져옵니다.
   */
  async getBookDetail(
    params: AladinBookDetailParams,
  ): Promise<AladinApiResult> {
    try {
      this.logger.log(
        `[getBookDetail] 요청 ISBN: ${params.itemId}, 유형: ${params.itemIdType || 'ISBN13'}`,
      );

      // 파라미터 유효성 확인
      if (!params.itemId) {
        this.logger.error('[getBookDetail] 유효하지 않은 ISBN 또는 itemId');
        throw new Error('유효하지 않은 ISBN 또는 itemId 입니다.');
      }

      // 알라딘 API 호출용 파라미터 구성
      const requestParams = {
        ttbkey: this.ttbKey,
        ItemId: params.itemId,
        ItemIdType: params.itemIdType || 'ISBN13',
        output: params.output || 'js',
        Version: params.version || this.defaultVersion,
        Cover: params.cover || 'Big',
        includeKey: params.includeKey || 0,
        offCode: params.offCode,
        OptResult: params.optResult
          ? params.optResult.join(',')
          : 'ebookList,usedList',
      };

      this.logger.log(
        `[getBookDetail] API 호출 파라미터: ${JSON.stringify(requestParams)}`,
      );

      const response = await axios.get(this.baseDetailUrl, {
        params: requestParams,
      });

      this.logger.log(
        `[getBookDetail] API 응답 상태: ${response.status}, 데이터: ${JSON.stringify(response.data.item ? '책 정보 있음' : '책 정보 없음')}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(`도서 상세 정보 조회 중 오류 발생: ${error.message}`);

      if (error.response) {
        this.logger.error(
          `상태 코드: ${error.response.status}, 응답: ${JSON.stringify(error.response.data || {})}`,
        );
      }

      if (error.config) {
        this.logger.error(
          `요청 URL: ${error.config.url}, 파라미터: ${JSON.stringify(error.config.params || {})}`,
        );
      }

      throw error;
    }
  }

  /**
   * 알라딘 API를 통해 중고상품 보유 매장 정보를 가져옵니다.
   */
  async getOffStoreList(params: AladinOffStoreListParams): Promise<any> {
    try {
      const response = await axios.get(this.baseOffStoreListUrl, {
        params: {
          ttbkey: this.ttbKey,
          ItemId: params.itemId,
          ItemIdType: params.itemIdType || 'ISBN13',
          output: params.output || 'js',
          Version: params.version || this.defaultVersion,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `중고상품 보유 매장 조회 중 오류 발생: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 알라딘 API 응답에서 Book 엔티티에 필요한 정보만 추출합니다.
   */
  extractBookData(item: AladinBook): any {
    // 저자 및 번역자 정보 처리
    let translator = null;
    const authorInfo = item.author.split(',');
    if (
      authorInfo.length > 1 &&
      authorInfo.some((info) => info.includes('역'))
    ) {
      // 번역자 정보가 있으면 분리
      const translators = authorInfo.filter((info) => info.includes('역'));
      translator = translators
        .map((t) => t.trim().replace('역', ''))
        .join(', ');
    }

    // 장르/태그 정보 추출
    let tags = null;
    if (item.subInfo?.categoryIdList) {
      const categories = Array.isArray(item.subInfo.categoryIdList)
        ? item.subInfo.categoryIdList
        : [item.subInfo.categoryIdList];

      // 카테고리 이름만 추출하여 태그로 사용
      tags = categories
        .filter((cat) => cat && typeof cat === 'object' && cat.name)
        .map((cat) => cat.name);
    }

    // 페이지 수 추출 (상세 설명에서 페이지 정보 찾기)
    let pageCount = null;
    if (item.subInfo?.fullDescription) {
      const pageMatch = item.subInfo.fullDescription.match(
        /(\d+)페이지|(\d+)쪽|(\d+)\s*p/i,
      );
      if (pageMatch) {
        pageCount = parseInt(pageMatch[1] || pageMatch[2] || pageMatch[3], 10);
      }
    }

    // 커버 이미지 URL에서 cover200을 cover500으로 교체
    let coverImage = item.cover || null;
    if (coverImage && typeof coverImage === 'string') {
      coverImage = coverImage.replace(/cover\d+/i, 'cover500');
    }

    return {
      title: item.title,
      author: authorInfo
        .filter((info) => !info.includes('역'))
        .join(', ')
        .trim(),
      translator,
      coverImage: coverImage,
      isbn: item.isbn,
      isbn13: item.isbn13,
      publisher: item.publisher,
      publishDate: item.pubDate ? new Date(item.pubDate) : null,
      rating: 0, // 알라딘 평점(customerReviewRank)은 사용하지 않고 항상 0으로 초기화
      reviews: 0, // 초기값
      totalRatings: 0, // 초기값
      pageCount,
      tags,
      description:
        item.description ||
        (item.subInfo?.fullDescription || '').substring(0, 500),
      priceSales: item.priceSales,
      priceStandard: item.priceStandard,
    };
  }
}
