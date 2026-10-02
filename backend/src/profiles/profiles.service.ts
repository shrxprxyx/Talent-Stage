import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioDto, SetSkillsDto, UpdateClientDto, UpdateFreelancerDto, UpdatePortfolioDto } from './dto/profile.dto';

// `embedding` is an Unsupported(vector) column; never select it in API responses.
const freelancerSelect = {
  id: true, userId: true, headline: true, bio: true, hourlyRate: true, location: true,
  available: true, ratingAvg: true, ratingCount: true, completedCount: true, challengePoints: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
  skills: { include: { skill: true } },
  portfolio: { orderBy: { createdAt: 'desc' as const } },
  badges: { include: { skill: true } },
};

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  // ---------- freelancer ----------
  private async freelancerIdOf(user: User) {
    const p = await this.prisma.freelancerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!p) throw new NotFoundException('Freelancer profile not found. Add the FREELANCER role first.');
    return p.id;
  }

  getMyFreelancer(user: User) {
    return this.prisma.freelancerProfile.findUniqueOrThrow({ where: { userId: user.id }, select: freelancerSelect });
  }

  async getFreelancer(id: string) {
    const p = await this.prisma.freelancerProfile.findUnique({ where: { id }, select: freelancerSelect });
    if (!p) throw new NotFoundException('Freelancer not found');
    return p;
  }

  updateFreelancer(user: User, dto: UpdateFreelancerDto) {
    return this.prisma.freelancerProfile.update({ where: { userId: user.id }, data: dto, select: freelancerSelect });
  }

  async setSkills(user: User, dto: SetSkillsDto) {
    const freelancerId = await this.freelancerIdOf(user);
    const ids = dto.skills.map((s) => s.skillId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate skills');
    const found = await this.prisma.skill.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('Unknown skillId in list');

    await this.prisma.$transaction([
      this.prisma.freelancerSkill.deleteMany({ where: { freelancerId } }),
      this.prisma.freelancerSkill.createMany({
        data: dto.skills.map((s) => ({ freelancerId, skillId: s.skillId, yearsExp: s.yearsExp ?? 0 })),
      }),
    ]);
    return this.getMyFreelancer(user);
  }

  // ---------- portfolio ----------
  async addPortfolio(user: User, dto: PortfolioDto) {
    const freelancerId = await this.freelancerIdOf(user);
    return this.prisma.portfolioItem.create({ data: { ...dto, freelancerId } });
  }

  private async ownedItem(user: User, itemId: string) {
    const freelancerId = await this.freelancerIdOf(user);
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item || item.freelancerId !== freelancerId) throw new NotFoundException('Portfolio item not found');
    return item;
  }

  async updatePortfolio(user: User, itemId: string, dto: UpdatePortfolioDto) {
    await this.ownedItem(user, itemId);
    return this.prisma.portfolioItem.update({ where: { id: itemId }, data: dto });
  }

  async deletePortfolio(user: User, itemId: string) {
    await this.ownedItem(user, itemId);
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  // ---------- client ----------
  getMyClient(user: User) {
    return this.prisma.clientProfile.findUniqueOrThrow({ where: { userId: user.id } });
  }

  updateClient(user: User, dto: UpdateClientDto) {
    return this.prisma.clientProfile.update({ where: { userId: user.id }, data: dto });
  }
}
