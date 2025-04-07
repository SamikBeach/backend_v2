import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AuthProvider } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  provider?: AuthProvider = AuthProvider.LOCAL;

  @IsString()
  @IsOptional()
  providerId?: string;

  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean = false;
}
