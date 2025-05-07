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
  DefaultValuePipe,
  Patch,
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
import { LibrarySortOption } from '../library/dto/library-response.dto';
import { StatisticsService } from '../statistics/statistics.service';
import { UpdateStatisticsSettingDto } from '../statistics/dto/statistics-setting.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly statisticsService: StatisticsService,
  ) {}

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
  @IsPublic()
  getUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @IsOwnProfile() isOwnProfile: boolean,
    @GetUser() currentUser?: User,
  ): Promise<UserDetailResponseDto> {
    const currentUserId = currentUser?.id;
    return this.userService.getUserProfile(id, isOwnProfile, currentUserId);
  }

  @Get(':id/libraries')
  @IsPublic()
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
  @IsPublic()
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
  @IsPublic()
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
  @IsPublic()
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

  /**
   * 사용자가 구독한 서재 목록을 페이지네이션과 함께 반환합니다.
   * @param userId 사용자 ID
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @param sort 정렬 옵션
   * @returns 구독한 서재 목록과 페이지네이션 정보
   */
  @Get(':userId/libraries/subscribed')
  @IsPublic()
  async getUserSubscribedLibraries(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sort') sort?: LibrarySortOption,
  ) {
    return this.userService.getUserSubscribedLibraries(userId, page, limit);
  }

  // 통계 설정 조회
  @Get(':id/statistics-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '사용자 통계 설정 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 통계 설정 정보',
  })
  async getUserStatisticsSettings(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    if (user.id !== id) {
      throw new UnauthorizedException('자신의 통계 설정만 조회할 수 있습니다.');
    }
    return this.statisticsService.getUserStatisticsSettings(id);
  }

  // 통계 설정 업데이트
  @Patch(':id/statistics-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '사용자 통계 설정 업데이트' })
  @ApiResponse({
    status: 200,
    description: '업데이트된 사용자 통계 설정 정보',
  })
  async updateUserStatisticsSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateStatisticsSettingDto,
    @GetUser() user: User,
  ) {
    if (user.id !== id) {
      throw new UnauthorizedException(
        '자신의 통계 설정만 업데이트할 수 있습니다.',
      );
    }
    return this.statisticsService.updateUserStatisticsSetting(id, updateDto);
  }

  // 독서 상태 통계
  @Get(':id/statistics/reading-status')
  @IsPublic()
  @ApiOperation({ summary: '독서 상태별 도서 수 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '독서 상태별 도서 수 통계',
  })
  async getReadingStatusStats(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getReadingStatusStats(id, requestUserId);
  }

  // 장르/카테고리 분석 통계
  @Get(':id/statistics/genre-analysis')
  @IsPublic()
  @ApiOperation({ summary: '장르/카테고리 분석 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '장르/카테고리 분석 통계',
  })
  async getGenreAnalysis(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getGenreAnalysis(id, requestUserId);
  }

  // 저자/출판사 통계
  @Get(':id/statistics/author-publisher')
  @IsPublic()
  @ApiOperation({ summary: '저자/출판사 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '저자/출판사 통계',
  })
  async getAuthorPublisherStats(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getAuthorPublisherStats(id, requestUserId);
  }

  // 리뷰 통계
  @Get(':id/statistics/reviews')
  @IsPublic()
  @ApiOperation({ summary: '리뷰 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '리뷰 작성 통계',
  })
  async getReviewStats(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getReviewStats(id, requestUserId);
  }

  // 평점 통계
  @Get(':id/statistics/ratings')
  @IsPublic()
  @ApiOperation({ summary: '평점 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '평점 통계',
  })
  async getRatingStats(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getRatingStats(id, requestUserId);
  }

  // 액티비티 빈도 통계
  @Get(':id/statistics/activity-frequency')
  @IsPublic()
  @ApiOperation({ summary: '액티비티 빈도 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '액티비티 빈도 통계',
  })
  async getActivityFrequency(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getActivityFrequency(id, requestUserId);
  }

  // 평가 습관 통계
  @Get(':id/statistics/rating-habits')
  @ApiOperation({ summary: '평가 습관 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '평가 습관 통계',
  })
  async getRatingHabits(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getRatingHabits(id, requestUserId);
  }

  // 사용자 상호작용 통계
  @Get(':id/statistics/user-interaction')
  @IsPublic()
  @ApiOperation({ summary: '사용자 상호작용 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 상호작용 통계',
  })
  async getUserInteraction(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getUserInteraction(id, requestUserId);
  }

  // 팔로워/팔로잉 통계
  @Get(':id/statistics/follower')
  @IsPublic()
  @ApiOperation({ summary: '팔로워/팔로잉 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '팔로워/팔로잉 통계',
  })
  async getFollowerStats(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getFollowerStats(id, requestUserId);
  }

  // 커뮤니티 활동 통계
  @Get(':id/statistics/community-activity')
  @IsPublic()
  @ApiOperation({ summary: '커뮤니티 활동 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '리뷰 타입별 기간별 통계',
  })
  async getCommunityActivity(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getCommunityActivity(id, requestUserId);
  }

  // 리뷰 영향력 통계
  @Get(':id/statistics/review-influence')
  @IsPublic()
  @ApiOperation({ summary: '리뷰 영향력 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '리뷰 영향력 통계',
  })
  async getReviewInfluence(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getReviewInfluence(id, requestUserId);
  }

  // 서재 구성 통계
  @Get(':id/statistics/library-composition')
  @IsPublic()
  @ApiOperation({ summary: '서재 구성 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '서재 구성 통계',
  })
  async getLibraryComposition(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getLibraryComposition(id, requestUserId);
  }

  // 서재 인기도 통계
  @Get(':id/statistics/library-popularity')
  @IsPublic()
  @ApiOperation({ summary: '서재 인기도 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '서재 인기도 통계',
  })
  async getLibraryPopularity(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getLibraryPopularity(id, requestUserId);
  }

  // 서재 업데이트 패턴 통계
  @Get(':id/statistics/library-update-pattern')
  @IsPublic()
  @ApiOperation({ summary: '서재 업데이트 패턴 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '서재 업데이트 패턴 통계',
  })
  async getLibraryUpdatePattern(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getLibraryUpdatePattern(id, requestUserId);
  }

  // 검색 활동 통계
  @Get(':id/statistics/search-activity')
  @IsPublic()
  @ApiOperation({ summary: '검색 활동 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '검색 활동 통계',
  })
  async getSearchActivity(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getSearchActivity(id, requestUserId);
  }

  // 기간별 독서 상태 통계
  @Get(':id/statistics/reading-status-by-period')
  @IsPublic()
  @ApiOperation({ summary: '기간별 독서 상태 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '연도별, 월별, 주별, 일별 독서 상태 통계',
  })
  async getReadingStatusByPeriod(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser?: User,
  ) {
    const requestUserId = currentUser?.id;
    return this.statisticsService.getReadingStatusByPeriod(id, requestUserId);
  }
}
