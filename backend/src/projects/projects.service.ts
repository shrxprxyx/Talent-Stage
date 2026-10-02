import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BrowseProjectsDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

// `embedding` is an Unsupported(vector) column; always select explicitly so it never leaks.
const projectSelect = {
  id: true, clientId: true, title: true, description: true, budgetMin: true, budgetMax: true,
  deadline: true, status: true, createdAt: true, updatedAt: true,
  skills: { include: { skill: true } },
  client: { select: { id: true, companyName: true, ratingAvg: true, ratingCount: true, user: { select: { id: true, name: true, avatarUrl: true } } } },
  _count: { select: { proposals: true } },
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private async clientIdOf(user: User) {
    const c = await this.prisma.clientProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!c) throw new NotFoundException('Client profile not found. Add the CLIENT role first.');
    return c.id;
  }

  private async assertSkillsExist(skillIds: string[]) {
    const unique = Array.from(new Set(skillIds));
    const found = await this.prisma.skill.count({ where: { id: { in: unique } } });
    if (found !== unique.length) throw new BadRequestException('Unknown skillId in list');
    return unique;
  }

  private async owned(user: User, id: string) {
    const clientId = await this.clientIdOf(user);
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, clientId: true, status: true, budgetMin: true, budgetMax: true } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== clientId) throw new ForbiddenException('Not your project');
    return project;
  }

  async create(user: User, dto: CreateProjectDto) {
    if (dto.budgetMin > dto.budgetMax) throw new BadRequestException('budgetMin must be <= budgetMax');
    const clientId = await this.clientIdOf(user);
    const skillIds = await this.assertSkillsExist(dto.skillIds);
    return this.prisma.project.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: dto.publish ? 'OPEN' : 'DRAFT',
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
      },
      select: projectSelect,
    });
  }

  async browse(q: BrowseProjectsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Prisma.ProjectWhereInput = {
      status: 'OPEN',
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { description: { contains: q.q, mode: 'insensitive' } }] } : {}),
      ...(q.skillId ? { skills: { some: { skillId: q.skillId } } } : {}),
      ...(q.minBudget !== undefined ? { budgetMax: { gte: q.minBudget } } : {}),
      ...(q.maxBudget !== undefined ? { budgetMin: { lte: q.maxBudget } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        select: projectSelect,
        orderBy: q.sort === 'budget' ? { budgetMax: 'desc' } : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async mine(user: User) {
    const clientId = await this.clientIdOf(user);
    return this.prisma.project.findMany({ where: { clientId }, select: projectSelect, orderBy: { createdAt: 'desc' } });
  }

  async get(user: User, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: projectSelect });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status === 'OPEN') return project;
    // non-open projects: owner, or the freelancer who has a proposal on it
    const isOwner = project.client && (await this.prisma.clientProfile.count({ where: { id: project.clientId, userId: user.id } })) > 0;
    const hasProposal = (await this.prisma.proposal.count({ where: { projectId: id, freelancer: { userId: user.id } } })) > 0;
    if (!isOwner && !hasProposal) throw new NotFoundException('Project not found');
    return project;
  }

  async update(user: User, id: string, dto: UpdateProjectDto) {
    const p = await this.owned(user, id);
    if (p.status !== 'DRAFT' && p.status !== 'OPEN') throw new BadRequestException('Only DRAFT or OPEN projects can be edited');
    const min = dto.budgetMin ?? Number(p.budgetMin);
    const max = dto.budgetMax ?? Number(p.budgetMax);
    if (min > max) throw new BadRequestException('budgetMin must be <= budgetMax');

    const { skillIds, deadline, ...rest } = dto;
    const skills = skillIds ? await this.assertSkillsExist(skillIds) : undefined;
    return this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
        ...(skills ? { skills: { deleteMany: {}, create: skills.map((skillId) => ({ skillId })) } } : {}),
      },
      select: projectSelect,
    });
  }

  async publish(user: User, id: string) {
    const p = await this.owned(user, id);
    if (p.status !== 'DRAFT') throw new BadRequestException('Only DRAFT projects can be published');
    return this.prisma.project.update({ where: { id }, data: { status: 'OPEN' }, select: projectSelect });
  }

  async cancel(user: User, id: string) {
    const p = await this.owned(user, id);
    if (p.status !== 'DRAFT' && p.status !== 'OPEN') throw new BadRequestException('A project in progress or finished cannot be cancelled here');
    const [, project] = await this.prisma.$transaction([
      this.prisma.proposal.updateMany({ where: { projectId: id, status: 'PENDING' }, data: { status: 'REJECTED' } }),
      this.prisma.project.update({ where: { id }, data: { status: 'CANCELLED' }, select: projectSelect }),
    ]);
    return project;
  }
}
