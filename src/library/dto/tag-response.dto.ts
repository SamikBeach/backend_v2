export interface TagResponseDto {
  id: number;
  name: string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagListResponseDto {
  tags: TagResponseDto[];
  totalCount: number;
}
