import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async forProject(user: User, projectId: string) {
    const client = await this.prisma.clientProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!client) throw new NotFoundException('Client profile not found. Add the CLIENT role first.');

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { clientId: true, budgetMax: true, skills: { select: { skill: { select: { name: true } } } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.clientId !== client.id) throw new ForbiddenException('Not your project');

    // `embedding` is never selected (Unsupported vector column)
    const freelancers = await this.prisma.freelancerProfile.findMany({
      where: { available: true, userId: { not: user.id } },
      take: 50,
      select: {
        id: true, headline: true, hourlyRate: true, ratingAvg: true, ratingCount: true, completedCount: true,
        user: { select: { name: true, avatarUrl: true } },
        skills: { select: { skill: { select: { name: true } } } },
      },
    });

    const ranked = (
      await this.ai.matchFreelancers({
        projectSkills: project.skills.map((s) => s.skill.name),
        budgetMax: Number(project.budgetMax),
        freelancers: freelancers.map((f) => ({
          id: f.id,
          skills: f.skills.map((s) => s.skill.name),
          hourlyRate: f.hourlyRate === null ? null : Number(f.hourlyRate),
          ratingAvg: f.ratingAvg,
          completedCount: f.completedCount,
        })),
      })
    ).slice(0, 10);

    // save results so they can be shown again without recomputing
    await this.prisma.$transaction(
      ranked.map((r) =>
        this.prisma.matchResult.upsert({
          where: { projectId_freelancerId: { projectId, freelancerId: r.freelancerId } },
          update: { score: r.score, reasoning: r.reasoning },
          create: { projectId, freelancerId: r.freelancerId, score: r.score, reasoning: r.reasoning },
        }),
      ),
    );

    const byId = new Map(freelancers.map((f) => [f.id, f]));
    return ranked.map((r) => {
      const f = byId.get(r.freelancerId)!;
      return {
        freelancerId: r.freelancerId,
        score: r.score,
        reasoning: r.reasoning,
        freelancer: {
          id: f.id,
          name: f.user.name,
          avatarUrl: f.user.avatarUrl,
          headline: f.headline,
          hourlyRate: f.hourlyRate,
          ratingAvg: f.ratingAvg,
          ratingCount: f.ratingCount,
          completedCount: f.completedCount,
          skills: f.skills.map((s) => s.skill.name),
        },
      };
    });
  }
}