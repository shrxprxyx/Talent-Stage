import { Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  // GET /notifications?page=1&limit=20&unreadOnly=true
  @Get()
  list(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('unreadOnly', new ParseBoolPipe({ optional: true })) unreadOnly?: boolean,
  ) {
    return this.notifications.list(user, page, Math.min(limit ?? 20, 50), unreadOnly);
  }

  // NOTE: fixed paths above ':id' routes
  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) { return this.notifications.unreadCount(user); }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) { return this.notifications.markAllRead(user); }

  @Post(':id/read')
  markRead(@CurrentUser() user: User, @Param('id') id: string) { return this.notifications.markRead(user, id); }
}
