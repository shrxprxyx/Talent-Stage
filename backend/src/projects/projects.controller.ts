import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BrowseProjectsDto, CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Post() @Roles('CLIENT')
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) { return this.projects.create(user, dto); }

  // browse open projects (freelancers, but any signed-in user may look)
  @Get()
  browse(@Query() q: BrowseProjectsDto) { return this.projects.browse(q); }

  // NOTE: 'mine' must stay above ':id'
  @Get('mine') @Roles('CLIENT')
  mine(@CurrentUser() user: User) { return this.projects.mine(user); }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) { return this.projects.get(user, id); }

  @Patch(':id') @Roles('CLIENT')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateProjectDto) { return this.projects.update(user, id, dto); }

  @Post(':id/publish') @Roles('CLIENT')
  publish(@CurrentUser() user: User, @Param('id') id: string) { return this.projects.publish(user, id); }

  @Post(':id/cancel') @Roles('CLIENT')
  cancel(@CurrentUser() user: User, @Param('id') id: string) { return this.projects.cancel(user, id); }
}
