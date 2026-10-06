import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';

// freelancer.embedding is excluded by selecting fields explicitly
const freelancerBrief = {
  select: {
    id: true, headline: true, hourlyRate: true, ratingAvg: true, ratingCount: true, completedCount: true,
    user: { select: { name: true, avatarUrl: true } },
  },
} as const;

const proposalSelect = {
  id: true, projectId: true, freelancerId: true, coverLetter: true, bidAmount: true, estimatedDays: true,
  status: true, aiScore: true, aiBreakdown: true, aiSummary: true, createdAt: true,
  freelancer: freelancerBrief,
  project: { select: { id: true, title: true, status: true, clientId: true, client: { select: { companyName: true, user: { select: { name: true } } } } } },
} satisfies Prisma.ProposalSelect;

@Injectable()
export class ProposalsService {
  private readonly log = new Logger(ProposalsService.name);

  constructor(private prisma: PrismaService, private ai: AiService) {}

  // Runs after the response is sent, so the freelancer never waits on the AI.
  private async scoreInBackground(proposalId: string) {
    try {
      const p = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
        select: {
          coverLetter: true, bidAmount: true, estimatedDays: true,
          project: { select: { budgetMin: true, budgetMax: true, skills: { select: { skill: { select: { name: true } } } } } },
          freelancer: { select: { ratingAvg: true, completedCount: true, skills: { select: { skill: { select: { name: true } } } } } },
        },
      });
      if (!p) return;
      const r = await this.ai.scoreProposal({
        coverLetter: p.coverLetter,
        bidAmount: Number(p.bidAmount),
        estimatedDays: p.estimatedDays,
        budgetMin: Number(p.project.budgetMin),
        budgetMax: Number(p.project.budgetMax),
        projectSkills: p.project.skills.map((s) => s.skill.name),
        freelancerSkills: p.freelancer.skills.map((s) => s.skill.name),
        completedCount: p.freelancer.completedCount,
        ratingAvg: p.freelancer.ratingAvg,
      });
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: { aiScore: r.score, aiBreakdown: r.breakdown, aiSummary: r.summary },
      });
    } catch (e) {
      this.log.warn(`AI scoring failed for ${proposalId}: ${e}`);
    }
  }

  private async freelancerOf(user: User) {
    const f = await this.prisma.freelancerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!f) throw new NotFoundException('Freelancer profile not found. Add the FREELANCER role first.');
    return f;
  }

  private async clientOf(user: User) {
    const c = await this.prisma.clientProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!c) throw new NotFoundException('Client profile not found. Add the CLIENT role first.');
    return c;
  }

  // ---------- freelancer side ----------
  async submit(user: User, projectId: string, dto: CreateProposalDto) {
    const freelancer = await this.freelancerOf(user);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, status: true, client: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'OPEN') throw new BadRequestException('This project is not accepting proposals');
    if (project.client.userId === user.id) throw new BadRequestException('You cannot bid on your own project');

    const existing = await this.prisma.proposal.findUnique({
      where: { projectId_freelancerId: { projectId, freelancerId: freelancer.id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You already submitted a proposal for this project');

    const proposal = await this.prisma.proposal.create({
      data: { projectId, freelancerId: freelancer.id, ...dto },
      select: proposalSelect,
    });
    await this.prisma.notification.create({
      data: {
        userId: project.client.userId,
        type: 'PROPOSAL_RECEIVED',
        title: 'New proposal',
        body: `${user.name} sent a proposal for "${project.title}"`,
        data: { projectId, proposalId: proposal.id },
      },
    });
    void this.scoreInBackground(proposal.id);
    return proposal;
  }

  async mine(user: User) {
    const f = await this.freelancerOf(user);
    return this.prisma.proposal.findMany({ where: { freelancerId: f.id }, select: proposalSelect, orderBy: { createdAt: 'desc' } });
  }

  private async ownedByFreelancer(user: User, id: string) {
    const f = await this.freelancerOf(user);
    const p = await this.prisma.proposal.findUnique({ where: { id }, select: { id: true, freelancerId: true, status: true } });
    if (!p || p.freelancerId !== f.id) throw new NotFoundException('Proposal not found');
    return p;
  }

  async update(user: User, id: string, dto: UpdateProposalDto) {
    const p = await this.ownedByFreelancer(user, id);
    if (p.status !== 'PENDING') throw new BadRequestException('Only PENDING proposals can be edited');
    const updated = await this.prisma.proposal.update({ where: { id }, data: dto, select: proposalSelect });
    void this.scoreInBackground(id);
    return updated;
  }

  async withdraw(user: User, id: string) {
    const p = await this.ownedByFreelancer(user, id);
    if (p.status !== 'PENDING') throw new BadRequestException('Only PENDING proposals can be withdrawn');
    return this.prisma.proposal.update({ where: { id }, data: { status: 'WITHDRAWN' }, select: proposalSelect });
  }

  // ---------- client side ----------
  async listForProject(user: User, projectId: string) {
    const client = await this.clientOf(user);
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== client.id) throw new ForbiddenException('Not your project');
    return this.prisma.proposal.findMany({ where: { projectId }, select: proposalSelect, orderBy: { createdAt: 'desc' } });
  }

  private async ownedByClient(user: User, id: string) {
    const client = await this.clientOf(user);
    const p = await this.prisma.proposal.findUnique({
      where: { id },
      select: { id: true, projectId: true, freelancerId: true, status: true, bidAmount: true, freelancer: { select: { userId: true } }, project: { select: { clientId: true, title: true, status: true } } },
    });
    if (!p || p.project.clientId !== client.id) throw new NotFoundException('Proposal not found');
    return { proposal: p, clientId: client.id };
  }

  async accept(user: User, id: string) {
    const { proposal, clientId } = await this.ownedByClient(user, id);

    const contract = await this.prisma.$transaction(async (tx) => {
      // guarded updates: only succeed if the state is still what we expect (protects against double-clicks and races)
      const proj = await tx.project.updateMany({ where: { id: proposal.projectId, status: 'OPEN' }, data: { status: 'IN_PROGRESS' } });
      if (proj.count === 0) throw new BadRequestException('Project is no longer open');
      const prop = await tx.proposal.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'ACCEPTED' } });
      if (prop.count === 0) throw new BadRequestException('Proposal is no longer pending');
      await tx.proposal.updateMany({ where: { projectId: proposal.projectId, id: { not: id }, status: 'PENDING' }, data: { status: 'REJECTED' } });

      return tx.contract.create({
        data: {
          projectId: proposal.projectId,
          proposalId: id,
          clientId,
          freelancerId: proposal.freelancerId,
          totalAmount: proposal.bidAmount,
          status: 'DRAFT', // becomes ACTIVE once milestones are funded (Phase 5)
        },
      });
    });

    await this.prisma.notification.create({
      data: {
        userId: proposal.freelancer.userId,
        type: 'PROPOSAL_ACCEPTED',
        title: 'Proposal accepted',
        body: `Your proposal for "${proposal.project.title}" was accepted`,
        data: { projectId: proposal.projectId, proposalId: id, contractId: contract.id },
      },
    });
    return { proposal: await this.prisma.proposal.findUnique({ where: { id }, select: proposalSelect }), contract };
  }

  async reject(user: User, id: string) {
    const { proposal } = await this.ownedByClient(user, id);
    if (proposal.status !== 'PENDING') throw new BadRequestException('Only PENDING proposals can be rejected');
    const updated = await this.prisma.proposal.update({ where: { id }, data: { status: 'REJECTED' }, select: proposalSelect });
    await this.prisma.notification.create({
      data: {
        userId: proposal.freelancer.userId,
        type: 'PROPOSAL_REJECTED',
        title: 'Proposal not selected',
        body: `Your proposal for "${proposal.project.title}" was not selected`,
        data: { projectId: proposal.projectId, proposalId: id },
      },
    });
    return updated;
  }
}