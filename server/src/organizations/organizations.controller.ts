import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('organizations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @Get('current')
  async getCurrent(@CurrentUser('organizationId') orgId: string) {
    return this.orgs.findOne(orgId);
  }

  @Put('current')
  @Roles('admin')
  async updateCurrent(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.orgs.update(orgId, body);
  }

  @Get('stats')
  async getStats(@CurrentUser('organizationId') orgId: string) {
    return this.orgs.getStats(orgId);
  }
}
