import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const user: User | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !required.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException('Requires role: ' + required.join(' or '));
    }
    return true;
  }
}