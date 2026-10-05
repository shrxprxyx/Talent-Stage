import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

const reviewSelect = {
  id: true, rating: true, comment: true, createdAt: true, reviewerId: true,
  reviewer: { select: { id: true, name: true, avatarUrl: true } },
} as const;

@Injectable()
export class ReviewsService {
  private readonly log = new Logger(ReviewsService.name);
  constructor(private prisma: PrismaService) {}

  /** 404 unless the caller is the client or the freelancer of the contract. */
  private async load(user: User, id: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        project: { select: { title: true } },
        client: { select: { userId: true } },
        freelancer: { select: { userId: true } },
      },
    });
    if (!c) throw new NotFoundException('Contract not found');
    const isClient = c.client.userId === user.id;
    const isFreelancer = c.freelancer.userId === user.id;
    if (!isClient && !isFreelancer) throw new NotFoundException('Contract not found');
    return { c, isClient };
  }

  async create(user: User, contractId: string, dto: CreateReviewDto) {
    const { c, isClient } = await this.load(user, contractId);
    if (c.status !== 'COMPLETED') throw new BadRequestException('You can leave a review once the contract is completed');
    const revieweeId = isClient ? c.freelancer.userId : c.client.userId;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.review.create({
          data: { contractId, reviewerId: user.id, revieweeId, rating: dto.rating, comment: dto.comment?.trim() || null },
        });
        // recompute the reviewee's rating in the capacity they were reviewed (freelancer or client)
        const agg = await tx.review.aggregate({
          where: { revieweeId, contract: isClient ? { freelancer: { userId: revieweeId } } : { client: { userId: revieweeId } } },
          _avg: { rating: true },
          _count: { rating: true },
        });
        const data = { ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100, ratingCount: agg._count.rating };
        if (isClient) await tx.freelancerProfile.update({ where: { userId: revieweeId }, data });
        else await tx.clientProfile.update({ where: { userId: revieweeId }, data });
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('You already reviewed this contract');
      throw e;
    }

    try {
      await this.prisma.notification.create({
        data: {
          userId: revieweeId,
          type: 'REVIEW_RECEIVED',
          title: 'New review',
          body: `${user.name} left you a ${dto.rating}-star review for "${c.project.title}"`,
          data: { contractId, projectId: c.projectId },
        },
      });
    } catch (e) {
      this.log.warn(`review notification failed: ${e instanceof Error ? e.message : e}`);
    }
    return this.forContract(user, contractId);
  }

  async forContract(user: User, contractId: string) {
    const { c } = await this.load(user, contractId);
    const rows = await this.prisma.review.findMany({ where: { contractId }, select: reviewSelect });
    const mine = rows.find((r) => r.reviewerId === user.id) ?? null;
    const theirs = rows.find((r) => r.reviewerId !== user.id) ?? null;
    return { mine, theirs, canReview: c.status === 'COMPLETED' && !mine };
  }

  async forUser(user: User, idParam: string, role: string | undefined, page: number) {
    const id = idParam === 'me' ? user.id : idParam;
    const limit = 20;
    const where = {
      revieweeId: id,
      ...(role === 'FREELANCER' ? { contract: { freelancer: { userId: id } } } : {}),
      ...(role === 'CLIENT' ? { contract: { client: { userId: id } } } : {}),
    };
    const [items, total, agg] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(1, page) - 1) * limit,
        take: limit,
        select: { ...reviewSelect, contract: { select: { project: { select: { id: true, title: true } } } } },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);
    return { items, total, average: Math.round((agg._avg.rating ?? 0) * 100) / 100, page, limit };
  }
}
