import { IsString, IsNotEmpty } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
