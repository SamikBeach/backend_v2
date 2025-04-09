import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AladinBookSearchParams {
  query?: string;
  queryType?: 'Keyword' | 'Title' | 'Author' | 'Publisher';
  start?: number;
  maxResults?: number;
  sort?: 'Accuracy' | 'PublishTime' | 'Title' | 'SalesPoint' | 'CustomerRating';
  cover?: 'Big' | 'MidBig' | 'Mid' | 'Small' | 'Mini' | 'None';
  categoryId?: number;
}

interface AladinBookListParams {
  queryType:
    | 'ItemNewAll'
    | 'ItemNewSpecial'
    | 'ItemEditorChoice'
    | 'Bestseller'
    | 'BlogBest';
  start?: number;
  maxResults?: number;
  cover?: 'Big' | 'MidBig' | 'Mid' | 'Small' | 'Mini' | 'None';
  categoryId?: number;
}

interface AladinBookDetailParams {
  itemId: string;
  itemIdType?: 'ISBN' | 'ISBN13' | 'ItemId';
  cover?: 'Big' | 'MidBig' | 'Mid' | 'Small' | 'Mini' | 'None';
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

  constructor(private readonly configService: ConfigService) {
    this.ttbKey = this.configService.get<string>('ALADIN_TTB_KEY');
    if (!this.ttbKey) {
      this.logger.error('알라딘 TTB 키가 설정되지 않았습니다!');
    }
  }

  /**
   * 알라딘 API를 통해 도서를 검색합니다.
   */
  async searchBooks(params: AladinBookSearchParams) {
    try {
      const response = await axios.get(this.baseSearchUrl, {
        params: {
          ttbkey: this.ttbKey,
          Query: params.query || '',
          QueryType: params.queryType || 'Keyword',
          MaxResults: params.maxResults || 10,
          start: params.start || 1,
          SearchTarget: 'Book',
          output: 'js',
          Version: '20131101',
          Cover: params.cover || 'Big',
          CategoryId: params.categoryId || 0,
          Sort: params.sort || 'Accuracy',
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
  async getBookList(params: AladinBookListParams) {
    try {
      const response = await axios.get(this.baseListUrl, {
        params: {
          ttbkey: this.ttbKey,
          QueryType: params.queryType,
          MaxResults: params.maxResults || 10,
          start: params.start || 1,
          SearchTarget: 'Book',
          output: 'js',
          Version: '20131101',
          Cover: params.cover || 'Big',
          CategoryId: params.categoryId || 0,
        },
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
  async getBookDetail(params: AladinBookDetailParams) {
    try {
      const response = await axios.get(this.baseDetailUrl, {
        params: {
          ttbkey: this.ttbKey,
          ItemId: params.itemId,
          ItemIdType: params.itemIdType || 'ISBN13',
          output: 'js',
          Version: '20131101',
          Cover: params.cover || 'Big',
          OptResult: 'ebookList,usedList',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`도서 상세 정보 조회 중 오류 발생: ${error.message}`);
      throw error;
    }
  }

  /**
   * 알라딘 API 응답에서 Book 엔티티에 필요한 정보만 추출합니다.
   */
  extractBookData(item: any, categoryId: string, subcategoryId: string) {
    return {
      title: item.title,
      author: item.author,
      coverImage: item.cover,
      isbn: item.isbn,
      isbn13: item.isbn13,
      publisher: item.publisher,
      publishDate: item.pubDate,
      rating: item.customerReviewRank / 2, // 알라딘은 10점 만점, 우리는 5점 만점
      reviews: 0, // 초기값
      description: item.description,
      categoryId,
      subcategoryId,
    };
  }
}
