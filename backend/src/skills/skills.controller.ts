import { Controller, Get, Query } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private skills: SkillsService) {}

  // GET /skills?q=react&category=Development
  @Get()
  list(@Query('q') q?: string, @Query('category') category?: string) {
    return this.skills.list(q, category);
  }

  @Get('categories')
  categories() {
    return this.skills.categories();
  }
}
