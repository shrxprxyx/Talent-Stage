import { Module } from '@nestjs/common';
import { ClientsController, FreelancersController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({ controllers: [FreelancersController, ClientsController], providers: [ProfilesService] })
export class ProfilesModule {}
