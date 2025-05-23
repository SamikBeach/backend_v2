import { AuthProvider } from '../../user/entities/user.entity';

export interface JwtPayload {
  sub: number;
  email: string | null;
  provider?: AuthProvider;
  providerId?: string;
  iat?: number;
  exp?: number;
}
