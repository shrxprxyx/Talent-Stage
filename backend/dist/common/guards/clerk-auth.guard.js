"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const backend_1 = require("@clerk/backend");
const prisma_service_1 = require("../../prisma/prisma.service");
const public_decorator_1 = require("../decorators/public.decorator");
let ClerkAuthGuard = class ClerkAuthGuard {
    reflector;
    prisma;
    clerk = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (isPublic)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            throw new common_1.UnauthorizedException('Missing token');
        let clerkId;
        try {
            const payload = await (0, backend_1.verifyToken)(token, { secretKey: process.env.CLERK_SECRET_KEY });
            clerkId = payload.sub;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token');
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
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector, prisma_service_1.PrismaService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk-auth.guard.js.map