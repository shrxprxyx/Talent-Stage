import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Missing token');

    let clerkId: string;
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
      clerkId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    let user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      const c = await this.clerk.users.getUser(clerkId);
      user = await this.prisma.user.upsert({
        where: { clerkId },
        update: {},
        create: {
          clerkId,
          email: c.emailAddresses[0]?.emailAddress ?? `${clerkId}@unknown.local`,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'New user',
          avatarUrl: c.imageUrl,
        },
      });
    }
    req.user = user;
    return true;
  }
}