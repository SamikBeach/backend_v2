import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import sharp from 'sharp';
import imageSize from 'image-size';

@Injectable()
export class ImageAnalyzerService {
  private readonly logger = new Logger(ImageAnalyzerService.name);

  /**
   * 이미지 URL에서 크기 정보를 추출합니다.
   * @param imageUrl 이미지 URL
   * @returns Promise<{width: number, height: number} | null>
   */
  async getImageDimensions(
    imageUrl: string,
  ): Promise<{ width: number; height: number } | null> {
    if (!imageUrl) {
      return null;
    }

    try {
      // HTTP 요청으로 이미지 데이터 가져오기
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000, // 10초 타임아웃
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const buffer = Buffer.from(response.data);

      // image-size 라이브러리로 크기 정보 추출 (더 빠름)
      try {
        const dimensions = imageSize(buffer);
        if (dimensions.width && dimensions.height) {
          this.logger.log(
            `Image dimensions extracted: ${dimensions.width}x${dimensions.height} for ${imageUrl}`,
          );
          return {
            width: dimensions.width,
            height: dimensions.height,
          };
        }
      } catch (imageSizeError) {
        this.logger.warn(
          `image-size failed, trying sharp: ${imageSizeError.message}`,
        );
      }

      // image-size가 실패하면 sharp 사용
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.width && metadata.height) {
          this.logger.log(
            `Image dimensions extracted with sharp: ${metadata.width}x${metadata.height} for ${imageUrl}`,
          );
          return {
            width: metadata.width,
            height: metadata.height,
          };
        }
      } catch (sharpError) {
        this.logger.warn(`Sharp also failed: ${sharpError.message}`);
      }

      this.logger.warn(`Could not extract dimensions from image: ${imageUrl}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to analyze image ${imageUrl}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 여러 이미지 URL의 크기 정보를 병렬로 추출합니다.
   * @param imageUrls 이미지 URL 배열
   * @returns Promise<Array<{url: string, width: number | null, height: number | null}>>
   */
  async getMultipleImageDimensions(imageUrls: string[]): Promise<
    Array<{
      url: string;
      width: number | null;
      height: number | null;
    }>
  > {
    const promises = imageUrls.map(async (url) => {
      const dimensions = await this.getImageDimensions(url);
      return {
        url,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
      };
    });

    return Promise.all(promises);
  }
}
