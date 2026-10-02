import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';
import { ProposalsService } from './proposals.service';

@Controller()
export class ProposalsController {
  constructor(private proposals: ProposalsService) {}

  // freelancer
  @Post('projects/:projectId/proposals') @Roles('FREELANCER')
  submit(@CurrentUser() user: User, @Param('projectId') projectId: string, @Body() dto: CreateProposalDto) {
    return this.proposals.submit(user, projectId, dto);
  }

  @Get('proposals/mine') @Roles('FREELANCER')
  mine(@CurrentUser() user: User) { return this.proposals.mine(user); }

  @Patch('proposals/:id') @Roles('FREELANCER')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateProposalDto) { return this.proposals.update(user, id, dto); }

  @Post('proposals/:id/withdraw') @Roles('FREELANCER')
  withdraw(@CurrentUser() user: User, @Param('id') id: string) { return this.proposals.withdraw(user, id); }

  // client
  @Get('projects/:projectId/proposals') @Roles('CLIENT')
  listForProject(@CurrentUser() user: User, @Param('projectId') projectId: string) { return this.proposals.listForProject(user, projectId); }

  @Post('proposals/:id/accept') @Roles('CLIENT')
  accept(@CurrentUser() user: User, @Param('id') id: string) { return this.proposals.accept(user, id); }

  @Post('proposals/:id/reject') @Roles('CLIENT')
  reject(@CurrentUser() user: User, @Param('id') id: string) { return this.proposals.reject(user, id); }
}
