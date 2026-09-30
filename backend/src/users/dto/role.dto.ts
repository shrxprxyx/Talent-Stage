import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class RoleDto {
  @IsEnum(Role)
  role: Role;
}