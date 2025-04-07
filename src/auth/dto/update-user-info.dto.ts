import { IsString, IsOptional } from 'class-validator';

export class UpdateUserInfoDto {
  @IsString()
  @IsOptional()
  username?: string;
}
