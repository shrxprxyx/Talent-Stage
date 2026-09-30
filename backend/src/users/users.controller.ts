import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleDto } from './dto/role.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Post('me/roles')
  addRole(@CurrentUser() user: User, @Body() dto: RoleDto) {
    return this.users.addRole(user, dto.role);
  }

  @Patch('me/active-role')
  setActive(@CurrentUser() user: User, @Body() dto: RoleDto) {
    return this.users.setActiveRole(user, dto.role);
  }
}