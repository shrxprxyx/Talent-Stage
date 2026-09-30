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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addRole(user, role) {
        const roles = Array.from(new Set([...user.roles, role]));
        return this.prisma.$transaction(async (tx) => {
            if (role === 'FREELANCER') {
                await tx.freelancerProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
            }
            else {
                await tx.clientProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
            }
            return tx.user.update({
                where: { id: user.id },
                data: { roles, activeRole: user.activeRole ?? role },
            });
        });
    }
    async setActiveRole(user, role) {
        if (!user.roles.includes(role))
            throw new common_1.BadRequestException('Add this role first');
        return this.prisma.user.update({ where: { id: user.id }, data: { activeRole: role } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map