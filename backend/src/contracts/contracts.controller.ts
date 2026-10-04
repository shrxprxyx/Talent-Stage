import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ContractsService } from './contracts.service';
import { RevisionDto, SetMilestonesDto, SubmitDeliverableDto } from './dto/contract.dto';

@Controller()
export class ContractsController {
  constructor(private contracts: ContractsService) {}

  // ---- contracts (both parties) ----
  @Get('contracts')
  list(@CurrentUser() user: User) { return this.contracts.list(user); }

  @Get('contracts/:id')
  get(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.get(user, id); }

  @Post('contracts/:id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.cancel(user, id); }

  // ---- client ----
  @Put('contracts/:id/milestones') @Roles('CLIENT')
  setMilestones(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SetMilestonesDto) {
    return this.contracts.setMilestones(user, id, dto);
  }

  // ---- freelancer ----
  @Post('contracts/:id/activate') @Roles('FREELANCER')
  activate(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.activate(user, id); }

  // ---- milestones ----
  @Get('milestones/:id')
  milestone(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.getMilestone(user, id); }

  @Post('milestones/:id/fund') @Roles('CLIENT')
  fund(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.fund(user, id); }

  @Post('milestones/:id/deliverables') @Roles('FREELANCER')
  submit(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SubmitDeliverableDto) {
    return this.contracts.submit(user, id, dto);
  }

  @Post('milestones/:id/approve') @Roles('CLIENT')
  approve(@CurrentUser() user: User, @Param('id') id: string) { return this.contracts.approve(user, id); }

  @Post('milestones/:id/request-revision') @Roles('CLIENT')
  requestRevision(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: RevisionDto) {
    return this.contracts.requestRevision(user, id, dto);
  }
}
