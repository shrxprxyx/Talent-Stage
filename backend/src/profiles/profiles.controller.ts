import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortfolioDto, SetSkillsDto, UpdateClientDto, UpdateFreelancerDto, UpdatePortfolioDto } from './dto/profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('freelancers')
export class FreelancersController {
  constructor(private profiles: ProfilesService) {}

  // NOTE: 'me' routes must stay above ':id' or Nest will treat "me" as an id.
  @Get('me') @Roles('FREELANCER')
  me(@CurrentUser() user: User) { return this.profiles.getMyFreelancer(user); }

  @Patch('me') @Roles('FREELANCER')
  update(@CurrentUser() user: User, @Body() dto: UpdateFreelancerDto) { return this.profiles.updateFreelancer(user, dto); }

  @Put('me/skills') @Roles('FREELANCER')
  setSkills(@CurrentUser() user: User, @Body() dto: SetSkillsDto) { return this.profiles.setSkills(user, dto); }

  @Post('me/portfolio') @Roles('FREELANCER')
  addPortfolio(@CurrentUser() user: User, @Body() dto: PortfolioDto) { return this.profiles.addPortfolio(user, dto); }

  @Patch('me/portfolio/:itemId') @Roles('FREELANCER')
  updatePortfolio(@CurrentUser() user: User, @Param('itemId') itemId: string, @Body() dto: UpdatePortfolioDto) {
    return this.profiles.updatePortfolio(user, itemId, dto);
  }

  @Delete('me/portfolio/:itemId') @Roles('FREELANCER')
  deletePortfolio(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.profiles.deletePortfolio(user, itemId);
  }

  // any signed-in user can view a freelancer's public profile
  @Get(':id')
  get(@Param('id') id: string) { return this.profiles.getFreelancer(id); }
}

@Controller('clients')
export class ClientsController {
  constructor(private profiles: ProfilesService) {}

  @Get('me') @Roles('CLIENT')
  me(@CurrentUser() user: User) { return this.profiles.getMyClient(user); }

  @Patch('me') @Roles('CLIENT')
  update(@CurrentUser() user: User, @Body() dto: UpdateClientDto) { return this.profiles.updateClient(user, dto); }
}
