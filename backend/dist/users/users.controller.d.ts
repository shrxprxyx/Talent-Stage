import type { User } from '@prisma/client';
import { RoleDto } from './dto/role.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private users;
    constructor(users: UsersService);
    me(user: User): {
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
    };
    addRole(user: User, dto: RoleDto): Promise<{
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
    setActive(user: User, dto: RoleDto): Promise<{
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
