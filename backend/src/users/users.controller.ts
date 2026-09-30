import { Body, Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PushTokenDto } from './dto/push-token.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  update(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.users.update(user, dto);
  }

  @Post('me/roles')
  addRole(@CurrentUser() user: User, @Body() dto: RoleDto) {
    return this.users.addRole(user, dto.role);
  }

  @Patch('me/active-role')
  setActive(@CurrentUser() user: User, @Body() dto: RoleDto) {
    return this.users.setActiveRole(user, dto.role);
  }

  @Put('me/push-token')
  setPushToken(@CurrentUser() user: User, @Body() dto: PushTokenDto) {
    return this.users.setPushToken(user, dto.token);
  }

  @Delete('me/push-token')
  clearPushToken(@CurrentUser() user: User) {
    return this.users.setPushToken(user, null);
  }
}