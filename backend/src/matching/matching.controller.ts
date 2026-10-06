import { Controller, Get, Param } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MatchingService } from './matching.service';

@Controller('projects')
export class MatchingController {
  constructor(private matching: MatchingService) {}

  // Client-only: top freelancer matches for one of their projects
  @Get(':id/matches') @Roles('CLIENT')
  matches(@CurrentUser() user: User, @Param('id') id: string) {
    return this.matching.forProject(user, id);
  }
}