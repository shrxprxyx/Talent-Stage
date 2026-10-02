import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(user: User, page = 1, limit = 20, unreadOnly = false) {
    const where = { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) };
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async unreadCount(user: User) {
    return { unread: await this.prisma.notification.count({ where: { userId: user.id, readAt: null } }) };
  }

  async markRead(user: User, id: string) {
    // updateMany scoped by userId so nobody can mark someone else's notification
    const r = await this.prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    if (r.count === 0) {
      const exists = await this.prisma.notification.count({ where: { id, userId: user.id } });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { ok: true };
  }

  async markAllRead(user: User) {
    const r = await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: r.count };
  }
}
