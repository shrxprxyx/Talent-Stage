import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    addRole(user: User, role: Role): Promise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        roles: import("@prisma/client").$Enums.Role[];
        activeRole: import("@prisma/client").$Enums.Role | null;
        expoPushToken: string | null;
        stripeAccountId: string | null;
        stripeOnboarded: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setActiveRole(user: User, role: Role): Promise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        roles: import("@prisma/client").$Enums.Role[];
        activeRole: import("@prisma/client").$Enums.Role | null;
        expoPushToken: string | null;
        stripeAccountId: string | null;
        stripeOnboarded: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
