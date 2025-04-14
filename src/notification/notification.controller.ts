import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 사용자의 모든 알림 조회 (페이지네이션)
   */
  @Get()
  async findAll(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.findAllForUserPaginated(
      user.id,
      page,
      limit,
    );
  }

  /**
   * 사용자의 읽지 않은 알림 개수 조회
   */
  @Get('count-unread')
  async countUnread(@GetUser() user: User) {
    const count = await this.notificationService.countUnreadForUser(user.id);
    return { count };
  }

  /**
   * 특정 알림 상세 조회
   */
  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationService.findOne(id);

    // 알림이 사용자의 것인지 확인
    if (notification.userId !== user.id) {
      return { error: '접근 권한이 없습니다.' };
    }

    return notification;
  }

  /**
   * 알림 읽음 상태 업데이트
   */
  @Patch(':id')
  async update(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    const notification = await this.notificationService.findOne(id);

    // 알림이 사용자의 것인지 확인
    if (notification.userId !== user.id) {
      return { error: '접근 권한이 없습니다.' };
    }

    return this.notificationService.update(id, updateNotificationDto);
  }

  /**
   * 모든 알림 읽음 상태로 변경
   */
  @Post('mark-all-read')
  async markAllAsRead(@GetUser() user: User) {
    await this.notificationService.markAllAsRead(user.id);
    return {
      success: true,
      message: '모든 알림이 읽음 상태로 변경되었습니다.',
    };
  }

  /**
   * 특정 알림 삭제
   */
  @Delete(':id')
  async remove(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationService.findOne(id);

    // 알림이 사용자의 것인지 확인
    if (notification.userId !== user.id) {
      return { error: '접근 권한이 없습니다.' };
    }

    await this.notificationService.remove(id);
    return { success: true, message: '알림이 삭제되었습니다.' };
  }

  /**
   * 사용자의 모든 알림 삭제
   */
  @Delete()
  async removeAll(@GetUser() user: User) {
    await this.notificationService.removeAllForUser(user.id);
    return { success: true, message: '모든 알림이 삭제되었습니다.' };
  }
}
