export interface LibraryTagResponseDto {
  id: number;
  tagId?: number;
  tagName: string;
  description?: string;
  usageCount: number;
  libraryId?: number;
  note?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface LibraryTagListResponseDto {
  tags: LibraryTagResponseDto[];
  totalCount: number;
}
