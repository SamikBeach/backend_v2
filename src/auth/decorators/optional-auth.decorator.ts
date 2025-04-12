import { applyDecorators, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';

export function OptionalAuth() {
  return applyDecorators(UseGuards(OptionalJwtAuthGuard));
}
