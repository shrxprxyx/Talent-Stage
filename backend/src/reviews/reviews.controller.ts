import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('contracts/:id/reviews')
  create(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user, id, dto);
  }

  @Get('contracts/:id/reviews')
  forContract(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reviews.forContract(user, id);
  }

  // :id can be "me"; ?role=FREELANCER|CLIENT limits to reviews received in that capacity
  @Get('users/:id/reviews')
  forUser(@CurrentUser() user: User, @Param('id') id: string, @Query('role') role?: string, @Query('page') page?: string) {
    return this.reviews.forUser(user, id, role, Number(page) || 1);
  }
}
