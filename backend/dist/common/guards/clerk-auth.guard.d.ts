import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
export declare class ClerkAuthGuard implements CanActivate {
    private reflector;
    private prisma;
    private clerk;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(ctx: ExecutionContext): Promise<boolean>;
}
