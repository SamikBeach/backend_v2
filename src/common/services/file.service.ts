import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // 개발 환경에서는 로컬 디렉토리에 저장
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * 이미지 파일을 저장하고 URL을 반환
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      const uniqueFileName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join(this.uploadDir, uniqueFileName);

      // 이미지 최적화 및 저장
      await this.optimizeAndSaveImage(file.buffer, filePath);

      // URL 생성 (실제 서비스 환경에서는 도메인을 앞에 붙여야 함)
      const baseUrl =
        this.configService.get<string>('SERVICE_URL') ||
        'http://localhost:3001';
      return `${baseUrl}/uploads/${uniqueFileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new Error('이미지 업로드에 실패했습니다.');
    }
  }

  /**
   * 이미지 최적화 및 저장
   */
  private async optimizeAndSaveImage(
    buffer: Buffer,
    filePath: string,
  ): Promise<void> {
    // 이미지 크기 최적화 (최대 너비 1200px)
    await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(filePath);
  }

  /**
   * 파일 삭제
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }
}
