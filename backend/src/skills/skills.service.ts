import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  list(q?: string, category?: string) {
    return this.prisma.skill.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async categories() {
    const rows = await this.prisma.skill.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } });
    return rows.map((r) => r.category);
  }
}
