import { IsNotEmpty, IsString } from 'class-validator';

export class AddTagToLibraryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
