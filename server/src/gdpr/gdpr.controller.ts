import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GdprService } from './gdpr.service';
import { Request } from 'express';

@Controller('gdpr')
export class GdprController {
  constructor(private gdpr: GdprService) {}

  // ==================== DPO ====================

  @Get('dpo')
  @UseGuards(AuthGuard('jwt'))
  async getDpo(@Req() req: any) { return this.gdpr.getDpo(req.user.organizationId); }

  @Post('dpo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async setDpo(@Req() req: any, @Body() body: { dpoName: string; dpoEmail: string; dpoPhone?: string; dpoTitle?: string }) {
    return this.gdpr.setDpo(req.user.organizationId, body, req.user.id);
  }

  @Delete('dpo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async removeDpo(@Req() req: any) { return this.gdpr.removeDpo(req.user.organizationId, req.user.id); }

  // ==================== DPIA ====================

  @Get('dpia')
  @UseGuards(AuthGuard('jwt'))
  async listDpias(@Req() req: any, @Query('status') status?: string) { return this.gdpr.listDpias(req.user.organizationId, status); }

  @Post('dpia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'analyst', 'superadmin')
  async createDpia(@Req() req: any, @Body() body: any) { return this.gdpr.createDpia(req.user.organizationId, { ...body, createdById: req.user.id }); }

  @Get('dpia/:id')
  @UseGuards(AuthGuard('jwt'))
  async getDpia(@Req() req: any, @Param('id') id: string) { return this.gdpr.getDpia(id, req.user.organizationId); }

  @Put('dpia/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'analyst', 'superadmin')
  async updateDpia(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.gdpr.updateDpia(id, req.user.organizationId, body, req.user.id); }

  @Put('dpia/:id/review')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async reviewDpia(@Req() req: any, @Param('id') id: string, @Body() body: { status: string; reviewNotes?: string }) {
    return this.gdpr.reviewDpia(id, req.user.organizationId, { ...body, reviewedById: req.user.id });
  }

  @Delete('dpia/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteDpia(@Req() req: any, @Param('id') id: string) { return this.gdpr.deleteDpia(id, req.user.organizationId, req.user.id); }

  // ==================== Data Portability ====================

  @Post('export')
  @UseGuards(AuthGuard('jwt'))
  async exportData(@Req() req: any, @Body() body: { format?: string; scope?: string }) {
    return this.gdpr.exportUserData(req.user.id, req.user.organizationId, body.format || 'json', body.scope || 'all');
  }

  @Get('exports')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async listExports(@Req() req: any) { return this.gdpr.listExports(req.user.organizationId); }

  // ==================== Consent ====================

  @Post('consent')
  async recordConsent(@Req() req: any, @Body() body: { userId: string; type: string; status: string; ipAddress?: string; userAgent?: string }) {
    return this.gdpr.recordConsent({ ...body, organizationId: req.user?.organizationId || '' });
  }

  @Post('consent/withdraw/:id')
  @UseGuards(AuthGuard('jwt'))
  async withdrawConsent(@Req() req: any, @Param('id') id: string) { return this.gdpr.withdrawConsent(id, req.user.organizationId); }

  @Get('consents')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async listConsents(@Req() req: any, @Query('userId') userId?: string) { return this.gdpr.listConsents(req.user.organizationId, userId); }

  @Get('user-consents')
  @UseGuards(AuthGuard('jwt'))
  async getUserConsents(@Req() req: any) { return this.gdpr.getUserConsents(req.user.id, req.user.organizationId); }

  @Post('user-consent')
  @UseGuards(AuthGuard('jwt'))
  async acceptUserConsent(@Req() req: any, @Body() body: { type: string; version: string; ipAddress?: string; userAgent?: string }) {
    return this.gdpr.acceptUserConsent({ ...body, userId: req.user.id, organizationId: req.user.organizationId });
  }

  // ==================== International Transfers ====================

  @Get('transfers')
  @UseGuards(AuthGuard('jwt'))
  async listTransfers(@Req() req: any) { return this.gdpr.listTransfers(req.user.organizationId); }

  @Post('transfers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async createTransfer(@Req() req: any, @Body() body: { thirdParty: string; country: string; purpose: string; dataCategories: string[]; legalMechanism: string }) {
    return this.gdpr.createTransfer(req.user.organizationId, body);
  }

  @Put('transfers/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateTransfer(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.gdpr.updateTransfer(id, req.user.organizationId, body); }

  @Delete('transfers/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteTransfer(@Req() req: any, @Param('id') id: string) { return this.gdpr.deleteTransfer(id, req.user.organizationId, req.user.id); }

  // ==================== Data Subject Rights ====================

  @Post('subject-request')
  @UseGuards(AuthGuard('jwt'))
  async createDsr(@Req() req: any, @Body() body: { type: string; description?: string }) {
    return this.gdpr.createDataSubjectRequest({ userId: req.user.id, organizationId: req.user.organizationId, type: body.type, description: body.description });
  }

  @Get('subject-requests')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin', 'auditor')
  async listDsrs(@Req() req: any, @Query('status') status?: string) { return this.gdpr.listDataSubjectRequests(req.user.organizationId, status); }

  @Put('subject-request/:id/process')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async processDsr(@Req() req: any, @Param('id') id: string, @Body() body: { status: string; rejectionReason?: string }) {
    return this.gdpr.processDataSubjectRequest(id, req.user.organizationId, { ...body, reviewedById: req.user.id });
  }

  // ==================== Privacy Policy ====================

  @Post('privacy-policy')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async createPrivacyPolicy(@Req() req: any, @Body() body: { version: string; title: string; content: string; effectiveDate: string }) {
    return this.gdpr.createPrivacyPolicy(req.user.organizationId, body);
  }

  @Get('privacy-policy')
  @UseGuards(AuthGuard('jwt'))
  async getPrivacyPolicy(@Req() req: any, @Query('version') version?: string) { return this.gdpr.getPrivacyPolicy(req.user.organizationId, version); }

  @Get('privacy-policies')
  @UseGuards(AuthGuard('jwt'))
  async listPrivacyPolicies(@Req() req: any) { return this.gdpr.listPrivacyPolicies(req.user.organizationId); }

  // ==================== Privacy Settings ====================

  @Get('settings')
  @UseGuards(AuthGuard('jwt'))
  async getSettings(@Req() req: any) { return this.gdpr.getPrivacySettings(req.user.organizationId); }

  @Put('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateSettings(@Req() req: any, @Body() body: { dataRetentionDays?: number; privacyPolicyUrl?: string }) {
    return this.gdpr.updatePrivacySettings(req.user.organizationId, body, req.user.id);
  }

  // ==================== Data Retention ====================

  @Get('retention-policies')
  @UseGuards(AuthGuard('jwt'))
  async getRetentionPolicies(@Req() req: any) { return this.gdpr.getRetentionPolicies(req.user.organizationId); }

  @Post('retention-policy')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async upsertRetentionPolicy(@Req() req: any, @Body() body: { dataCategory: string; retentionDays: number; action: string; legalHold?: boolean; description?: string }) {
    return this.gdpr.upsertRetentionPolicy(req.user.organizationId, body);
  }

  // ==================== Dashboard ====================

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboard(@Req() req: any) { return this.gdpr.getGdprDashboard(req.user.organizationId); }
}
