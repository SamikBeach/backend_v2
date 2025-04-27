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
  Delete,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
  Put,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { IsOwnProfile } from '../auth/decorators/is-own-profile.decorator';
import {
  UserDetailResponseDto,
  FollowersListResponseDto,
  FollowingListResponseDto,
  UpdateUserDto,
} from './dto/user.dto';
import { ReadingStatusType } from '../reading-status/entities/reading-status.entity';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@GetUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('사용자 인증이 필요합니다');
    }

    return this.userService.getCurrentUser(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
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
    @GetUser() currentUser?: User,
  ): Promise<UserDetailResponseDto> {
    const currentUserId = currentUser?.id;
    return this.userService.getUserProfile(id, isOwnProfile, currentUserId);
  }

  @Get(':id/libraries')
  getUserLibraries(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @GetUser() currentUser?: User,
  ) {
    const currentUserId = currentUser?.id;
    return this.userService.getUserLibraries(id, page, limit, currentUserId);
  }

  @Get(':userId/reviews')
  @IsPublic()
  async getUserReviews(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string | string[],
    @Query('filter') filter?: 'popular' | 'recent',
    @GetUser() user?: User,
  ) {
    // Express의 기본 동작에 의해 배열 쿼리 파라미터는 자동으로 배열로 변환됨
    // 단일 값인 경우도 처리하기 위해 항상 배열로 변환
    const typeArray =
      typeof type === 'string'
        ? [type]
        : Array.isArray(type)
          ? type
          : undefined;

    return this.userService.getUserReviews(
      userId,
      page ? +page : 1,
      limit ? +limit : 10,
      typeArray,
      filter || 'recent',
      user?.id,
    );
  }

  @Get(':id/stats')
  getUserReadingStats(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
  ) {
    // This will be implemented later as per the requirements
    return { message: 'This endpoint will be implemented later' };
  }

  // 팔로워 목록 조회 엔드포인트
  @Get(':id/followers')
  getFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @GetUser() currentUser?: User,
  ): Promise<FollowersListResponseDto> {
    const currentUserId = currentUser?.id;
    return this.userService.getFollowers(id, page, limit, currentUserId);
  }

  // 팔로잉 목록 조회 엔드포인트
  @Get(':id/following')
  getFollowing(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @GetUser() currentUser?: User,
  ): Promise<FollowingListResponseDto> {
    const currentUserId = currentUser?.id;
    return this.userService.getFollowing(id, page, limit, currentUserId);
  }

  // 팔로우 엔드포인트
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async followUser(
    @Param('id', ParseIntPipe) followingId: number,
    @GetUser() user: User,
  ): Promise<void> {
    await this.userService.followUser(user.id, followingId);
  }

  // 언팔로우 엔드포인트
  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(
    @Param('id', ParseIntPipe) followingId: number,
    @GetUser() user: User,
  ): Promise<void> {
    await this.userService.unfollowUser(user.id, followingId);
  }

  @Post('verify')
  @IsPublic()
  verifyEmail(
    @Body('email') email: string,
    @Body('code') code: string,
  ): Promise<User> {
    return this.userService.verifyEmail(email, code);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfile(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateUserProfile(user.id, updateUserDto, file);
  }

  @Get(':id/books')
  getUserBooks(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
    @Query('status') status: ReadingStatusType,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
  ) {
    return this.userService.getUserBooks(id, status, page, limit);
  }

  @Get(':id/reading-status-counts')
  @IsPublic()
  async getUserReadingStatusCounts(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserReadingStatusCounts(id);
  }

  @Get(':id/review-type-counts')
  @IsPublic()
  async getUserReviewTypeCounts(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserReviewTypeCounts(id);
  }

  @Get(':userId/ratings')
  @IsPublic()
  async getUserRatings(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser() user?: User,
  ) {
    return this.userService.getUserRatings(
      userId,
      page ? +page : 1,
      limit ? +limit : 10,
      user?.id,
    );
  }

  @Get(':userId/ratings-by-score')
  @IsPublic()
  async getUserRatingsByScore(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser() user?: User,
  ) {
    return this.userService.getUserRatingsByScore(userId);
  }

  @Get(':userId/activity')
  @IsPublic()
  async getUserActivity(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('filter') filter?: 'popular' | 'recent',
    @GetUser() user?: User,
  ) {
    return this.userService.getUserActivity(
      userId,
      page ? +page : 1,
      limit ? +limit : 10,
      filter || 'recent',
      user?.id,
    );
  }
}
