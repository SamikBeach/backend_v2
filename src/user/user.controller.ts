import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { IsOwnProfile } from '../auth/decorators/is-own-profile.decorator';
import { UserDetailResponseDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getCurrentUser(@GetUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('사용자 인증이 필요합니다');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      marketingConsent: user.marketingConsent,
      createdAt: user.createdAt,
    };
  }

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findOne(id);
  }

  @Get(':id/profile')
  getUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
  ): Promise<UserDetailResponseDto> {
    return this.userService.getUserProfile(id, isOwnProfile);
  }

  @Get(':id/libraries')
  getUserLibraries(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // This will be implemented later as per the requirements
    return { message: 'This endpoint will be implemented later' };
  }

  @Get(':id/reviews')
  getUserReviews(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // This will be implemented later as per the requirements
    return { message: 'This endpoint will be implemented later' };
  }

  @Get(':id/stats')
  getUserReadingStats(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
  ) {
    // This will be implemented later as per the requirements
    return { message: 'This endpoint will be implemented later' };
  }

  @Post('verify')
  @IsPublic()
  verifyEmail(
    @Body('email') email: string,
    @Body('code') code: string,
  ): Promise<User> {
    return this.userService.verifyEmail(email, code);
  }
}
