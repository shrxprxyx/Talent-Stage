import { BadRequestException, Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async addRole(user: User, role: Role) {
    const roles = Array.from(new Set([...user.roles, role]));
    return this.prisma.$transaction(async (tx) => {
      if (role === 'FREELANCER') {
        await tx.freelancerProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      } else {
        await tx.clientProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      }
      return tx.user.update({
        where: { id: user.id },
        data: { roles, activeRole: user.activeRole ?? role },
      });
    });
  }

  async setActiveRole(user: User, role: Role) {
    if (!user.roles.includes(role)) throw new BadRequestException('Add this role first');
    return this.prisma.user.update({ where: { id: user.id }, data: { activeRole: role } });
  }

  update(user: User, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id: user.id }, data: dto });
  }

  setPushToken(user: User, token: string | null) {
    return this.prisma.user.update({ where: { id: user.id }, data: { expoPushToken: token } });
  }
}