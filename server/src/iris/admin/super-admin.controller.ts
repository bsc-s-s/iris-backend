import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuperAdminService } from './super-admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private admin: SuperAdminService) {}

  // ─── INVITATIONS ───
  @Post('invitations')
  async createInvitation(@Body() body: { email: string; role?: string; organizationId?: string }, @Req() req: any) {
    if (req.user.email !== 'brianburgoa@gmail.com') throw new UnauthorizedException('Only the authorized super admin can create invitations');
    return this.admin.createInvitation(body.email, body.role || 'member', body.organizationId);
  }

  @Get('invitations')
  async listInvitations() {
    return this.admin.listInvitations();
  }

  @Post('invitations/:id/revoke')
  async revokeInvitation(@Param('id') id: string) {
    return this.admin.revokeInvitation(id);
  }

  // ─── LICENSES ───
  @Post('licenses')
  async assignLicense(@Body() body: { organizationId: string; plan: string }) {
    return this.admin.assignLicense(body.organizationId, body.plan);
  }

  @Get('licenses')
  async listLicenses() {
    return this.admin.listLicenses();
  }

  // ─── ORGANIZATIONS ───
  @Get('organizations')
  async listOrganizations() {
    return this.admin.listOrganizations();
  }

  @Get('organizations/:id')
  async getOrganizationDetail(@Param('id') id: string) {
    return this.admin.getOrganizationDetail(id);
  }

  // ─── USERS ───
  @Get('users')
  async listUsers() {
    return this.admin.listUsers();
  }

  @Post('users/:id/suspend')
  async suspendUser(@Param('id') id: string) {
    return this.admin.suspendUser(id);
  }

  // ─── SYSTEM HEALTH ───
  @Get('system')
  async getSystemHealth() {
    return this.admin.getSystemHealth();
  }

  // ─── PLATFORM STATS ───
  @Get('stats')
  async getPlatformStats() {
    return this.admin.getPlatformStats();
  }

  // ─── IRIS SEED ───
  @Post('seed/questions')
  async seedQuestions() {
    return this.admin.seedIrisQuestions();
  }
}
