import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationType, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RevisionDto, SetMilestonesDto, SubmitDeliverableDto } from './dto/contract.dto';

const userBrief = { select: { id: true, name: true, avatarUrl: true } } as const;

const contractInclude = {
  project: { select: { id: true, title: true, status: true } },
  client: { select: { id: true, userId: true, companyName: true, user: userBrief } },
  freelancer: { select: { id: true, userId: true, headline: true, user: userBrief } },
  milestones: {
    orderBy: { order: 'asc' as const },
    include: {
      payment: { select: { status: true, amount: true, currency: true } },
      deliverables: { orderBy: { submittedAt: 'desc' as const } },
    },
  },
} satisfies Prisma.ContractInclude;

const cents = (n: number | string | { toString(): string }) => Math.round(Number(n) * 100);
const usd = (n: number | string | { toString(): string }) => `$${Number(n).toFixed(2)}`;

@Injectable()
export class ContractsService {
  private readonly log = new Logger(ContractsService.name);
  constructor(private prisma: PrismaService) {}

  /* ------------------------------ helpers ------------------------------ */

  /** Notifications must never break the action that triggered them. */
  private async notify(userId: string, type: NotificationType, title: string, body: string, data: Record<string, string>) {
    try {
      await this.prisma.notification.create({ data: { userId, type, title, body, data } });
    } catch (e) {
      this.log.warn(`notification failed (${type}): ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Loads a contract and checks the caller is one of its two parties (404 otherwise, so ids don't leak). */
  private async load(user: User, id: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, title: true } },
        client: { select: { userId: true } },
        freelancer: { select: { id: true, userId: true } },
      },
    });
    if (!c) throw new NotFoundException('Contract not found');
    const isClient = c.client.userId === user.id;
    const isFreelancer = c.freelancer.userId === user.id;
    if (!isClient && !isFreelancer) throw new NotFoundException('Contract not found');
    return { c, isClient, isFreelancer };
  }

  private async loadMilestone(user: User, id: string) {
    const m = await this.prisma.milestone.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true, status: true, projectId: true,
            project: { select: { title: true } },
            client: { select: { userId: true } },
            freelancer: { select: { id: true, userId: true } },
          },
        },
      },
    });
    if (!m) throw new NotFoundException('Milestone not found');
    const isClient = m.contract.client.userId === user.id;
    const isFreelancer = m.contract.freelancer.userId === user.id;
    if (!isClient && !isFreelancer) throw new NotFoundException('Milestone not found');
    return { m, isClient, isFreelancer };
  }

  /* ------------------------------ contracts ------------------------------ */

  async list(user: User) {
    const rows = await this.prisma.contract.findMany({
      where: { OR: [{ client: { userId: user.id } }, { freelancer: { userId: user.id } }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, totalAmount: true, startedAt: true, completedAt: true, createdAt: true,
        project: { select: { id: true, title: true } },
        client: { select: { userId: true, companyName: true, user: userBrief } },
        freelancer: { select: { userId: true, user: userBrief } },
        milestones: { select: { status: true } },
      },
    });
    return rows.map(({ milestones, ...c }) => ({
      ...c,
      myRole: c.client.userId === user.id ? ('CLIENT' as const) : ('FREELANCER' as const),
      progress: {
        total: milestones.filter((m) => m.status !== 'CANCELLED').length,
        released: milestones.filter((m) => m.status === 'RELEASED').length,
      },
    }));
  }

  async get(user: User, id: string) {
    const c = await this.prisma.contract.findUnique({ where: { id }, include: contractInclude });
    if (!c || (c.client.userId !== user.id && c.freelancer.userId !== user.id)) throw new NotFoundException('Contract not found');
    return { ...c, myRole: c.client.userId === user.id ? ('CLIENT' as const) : ('FREELANCER' as const) };
  }

  /** Client defines (or redefines) the milestones while the contract is still a draft. */
  async setMilestones(user: User, id: string, dto: SetMilestonesDto) {
    const { c, isClient } = await this.load(user, id);
    if (!isClient) throw new ForbiddenException('Only the client can set milestones');
    if (c.status !== 'DRAFT') throw new BadRequestException('Milestones can only be edited while the contract is a draft');

    const total = cents(c.totalAmount);
    const sum = dto.milestones.reduce((s, m) => s + cents(m.amount), 0);
    if (sum !== total) {
      throw new BadRequestException(`Milestone amounts must add up to the contract total (${usd(total / 100)}); they currently add up to ${usd(sum / 100)}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const draft = await tx.contract.count({ where: { id, status: 'DRAFT' } });
      if (!draft) throw new BadRequestException('Contract is no longer a draft');
      await tx.milestone.deleteMany({ where: { contractId: id } });
      await tx.milestone.createMany({
        data: dto.milestones.map((m, i) => ({
          contractId: id,
          order: i + 1,
          title: m.title.trim(),
          description: m.description?.trim() || null,
          amount: m.amount,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
        })),
      });
    });

    await this.notify(c.freelancer.userId, 'CONTRACT_MILESTONES_SET', 'Milestones proposed',
      `"${c.project.title}": review the milestones and accept the contract`, { projectId: c.projectId, contractId: id });
    return this.get(user, id);
  }

  /** Freelancer accepts the terms: DRAFT -> ACTIVE. */
  async activate(user: User, id: string) {
    const { c, isFreelancer } = await this.load(user, id);
    if (!isFreelancer) throw new ForbiddenException('Only the freelancer can accept the contract terms');

    await this.prisma.$transaction(async (tx) => {
      const n = await tx.milestone.count({ where: { contractId: id } });
      if (n === 0) throw new BadRequestException('The client has not defined milestones yet');
      const r = await tx.contract.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'ACTIVE', startedAt: new Date() } });
      if (r.count === 0) throw new BadRequestException('Contract is not a draft');
    });

    await this.notify(c.client.userId, 'CONTRACT_ACTIVATED', 'Contract accepted',
      `The freelancer accepted "${c.project.title}". You can now fund the first milestone`, { projectId: c.projectId, contractId: id });
    return this.get(user, id);
  }

  /** Either party can cancel, but only while no money is held or released. */
  async cancel(user: User, id: string) {
    const { c, isClient } = await this.load(user, id);
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') throw new BadRequestException(`Contract is already ${c.status.toLowerCase()}`);

    await this.prisma.$transaction(async (tx) => {
      const blocking = await tx.milestone.count({ where: { contractId: id, status: { notIn: ['PENDING', 'CANCELLED'] } } });
      if (blocking > 0) throw new ConflictException('Funds are already held or released on this contract, so it cannot be cancelled here');
      const r = await tx.contract.updateMany({ where: { id, status: { in: ['DRAFT', 'ACTIVE'] } }, data: { status: 'CANCELLED' } });
      if (r.count === 0) throw new BadRequestException('Contract can no longer be cancelled');
      await tx.milestone.updateMany({ where: { contractId: id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      await tx.project.update({ where: { id: c.projectId }, data: { status: 'CANCELLED' } });
    });

    await this.notify(isClient ? c.freelancer.userId : c.client.userId, 'CONTRACT_CANCELLED', 'Contract cancelled',
      `"${c.project.title}" was cancelled by the ${isClient ? 'client' : 'freelancer'}`, { projectId: c.projectId, contractId: id });
    return this.get(user, id);
  }

  /* ------------------------------ milestones ------------------------------ */

  async getMilestone(user: User, id: string) {
    const { m, isClient } = await this.loadMilestone(user, id);
    const full = await this.prisma.milestone.findUnique({
      where: { id },
      include: {
        payment: { select: { status: true, amount: true, currency: true } },
        deliverables: { orderBy: { submittedAt: 'desc' } },
      },
    });
    return { ...full, contractId: m.contract.id, contractStatus: m.contract.status, myRole: isClient ? ('CLIENT' as const) : ('FREELANCER' as const) };
  }

  /**
   * MOCK FUNDING (Phase 5, part 1): marks the milestone FUNDED and records a HELD payment.
   * Part 2 replaces this with a Stripe Checkout session; the status flow stays the same.
   */
  async fund(user: User, id: string) {
    const { m, isClient } = await this.loadMilestone(user, id);
    if (!isClient) throw new ForbiddenException('Only the client can fund a milestone');
    if (m.contract.status !== 'ACTIVE') throw new BadRequestException('The freelancer must accept the contract before milestones can be funded');

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.milestone.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'FUNDED' } });
      if (r.count === 0) throw new BadRequestException('This milestone is already funded or closed');
      await tx.payment.upsert({
        where: { milestoneId: id },
        update: { status: 'HELD' },
        create: { milestoneId: id, amount: m.amount, status: 'HELD' },
      });
    });

    await this.notify(m.contract.freelancer.userId, 'MILESTONE_FUNDED', 'Milestone funded',
      `"${m.title}" (${usd(m.amount)}) is funded. You can start work`, { projectId: m.contract.projectId, contractId: m.contract.id, milestoneId: id });
    return { ...(await this.getMilestone(user, id)), mock: true };
  }

  /** Freelancer submits work: FUNDED or REVISION_REQUESTED -> SUBMITTED. */
  async submit(user: User, id: string, dto: SubmitDeliverableDto) {
    const { m, isFreelancer } = await this.loadMilestone(user, id);
    if (!isFreelancer) throw new ForbiddenException('Only the freelancer can submit work');
    if (m.contract.status !== 'ACTIVE') throw new BadRequestException('Contract is not active');
    const note = dto.note?.trim();
    if (!note && !dto.fileKeys?.length) throw new BadRequestException('Add a note or at least one file');

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.milestone.updateMany({ where: { id, status: { in: ['FUNDED', 'REVISION_REQUESTED'] } }, data: { status: 'SUBMITTED' } });
      if (r.count === 0) throw new BadRequestException('This milestone must be funded before work can be submitted');
      await tx.deliverable.create({ data: { milestoneId: id, note: note || null, fileKeys: dto.fileKeys ?? [] } });
    });

    await this.notify(m.contract.client.userId, 'MILESTONE_SUBMITTED', 'Work submitted',
      `Work for "${m.title}" is ready for your review`, { projectId: m.contract.projectId, contractId: m.contract.id, milestoneId: id });
    return this.getMilestone(user, id);
  }

  /**
   * Client approves: SUBMITTED -> RELEASED and the held payment is released.
   * MOCK: part 2 creates the Stripe Transfer to the freelancer here. When every
   * milestone is released the contract and project complete.
   */
  async approve(user: User, id: string) {
    const { m, isClient } = await this.loadMilestone(user, id);
    if (!isClient) throw new ForbiddenException('Only the client can approve work');

    const completed = await this.prisma.$transaction(async (tx) => {
      const r = await tx.milestone.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'RELEASED' } });
      if (r.count === 0) throw new BadRequestException('This milestone is not waiting for approval');
      await tx.payment.updateMany({ where: { milestoneId: id, status: 'HELD' }, data: { status: 'RELEASED' } });

      const open = await tx.milestone.count({ where: { contractId: m.contract.id, status: { notIn: ['RELEASED', 'CANCELLED'] } } });
      if (open > 0) return false;

      const done = await tx.contract.updateMany({ where: { id: m.contract.id, status: 'ACTIVE' }, data: { status: 'COMPLETED', completedAt: new Date() } });
      if (done.count === 0) return false;
      await tx.project.update({ where: { id: m.contract.projectId }, data: { status: 'COMPLETED' } });
      await tx.freelancerProfile.update({ where: { id: m.contract.freelancer.id }, data: { completedCount: { increment: 1 } } });
      return true;
    });

    const base = { projectId: m.contract.projectId, contractId: m.contract.id, milestoneId: id };
    await this.notify(m.contract.freelancer.userId, 'PAYMENT_RELEASED', 'Payment released',
      `${usd(m.amount)} for "${m.title}" was released to you`, base);
    if (completed) {
      const body = `"${m.contract.project.title}" is complete`;
      await this.notify(m.contract.freelancer.userId, 'CONTRACT_COMPLETED', 'Contract completed', body, base);
      await this.notify(m.contract.client.userId, 'CONTRACT_COMPLETED', 'Contract completed', body, base);
    }
    return { ...(await this.getMilestone(user, id)), contractCompleted: completed, mock: true };
  }

  /** Client asks for changes: SUBMITTED -> REVISION_REQUESTED, feedback stored on the latest deliverable. */
  async requestRevision(user: User, id: string, dto: RevisionDto) {
    const { m, isClient } = await this.loadMilestone(user, id);
    if (!isClient) throw new ForbiddenException('Only the client can request a revision');
    const feedback = dto.feedback.trim();

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.milestone.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'REVISION_REQUESTED' } });
      if (r.count === 0) throw new BadRequestException('This milestone is not waiting for review');
      const last = await tx.deliverable.findFirst({ where: { milestoneId: id }, orderBy: { submittedAt: 'desc' } });
      if (last) await tx.deliverable.update({ where: { id: last.id }, data: { feedback } });
    });

    await this.notify(m.contract.freelancer.userId, 'MILESTONE_REVISION_REQUESTED', 'Changes requested',
      `The client asked for changes on "${m.title}"`, { projectId: m.contract.projectId, contractId: m.contract.id, milestoneId: id });
    return this.getMilestone(user, id);
  }
}
