import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Iso27001Service } from './iso27001.service';

@Controller('iso27001')
export class Iso27001Controller {
  constructor(private iso: Iso27001Service) {}

  // ==================== Backup Config ====================

  @Get('backup')
  @UseGuards(AuthGuard('jwt'))
  async getBackupConfig(@Req() req: any) { return this.iso.getBackupConfig(req.user.organizationId); }

  @Put('backup')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateBackupConfig(@Req() req: any, @Body() body: any) { return this.iso.upsertBackupConfig(req.user.organizationId, body, req.user.id); }

  @Post('backup/record')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async recordBackup(@Req() req: any, @Body() body: { status: string; size?: number }) { return this.iso.recordBackup(req.user.organizationId, body); }

  // ==================== DRP ====================

  @Get('drp')
  @UseGuards(AuthGuard('jwt'))
  async getDrp(@Req() req: any) { return this.iso.getDrp(req.user.organizationId); }

  @Put('drp')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateDrp(@Req() req: any, @Body() body: any) { return this.iso.upsertDrp(req.user.organizationId, body, req.user.id); }

  @Post('drp/test')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async testDrp(@Req() req: any, @Body() body: any) { return this.iso.testDrp(req.user.organizationId, body, req.user.id); }

  // ==================== Cloud Providers ====================

  @Get('providers')
  @UseGuards(AuthGuard('jwt'))
  async listProviders(@Req() req: any) { return this.iso.listProviders(req.user.organizationId); }

  @Post('providers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async createProvider(@Req() req: any, @Body() body: any) { return this.iso.createProvider(req.user.organizationId, body, req.user.id); }

  @Put('providers/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateProvider(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.iso.updateProvider(id, req.user.organizationId, body, req.user.id); }

  @Delete('providers/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteProvider(@Req() req: any, @Param('id') id: string) { return this.iso.deleteProvider(id, req.user.organizationId, req.user.id); }

  // ==================== Encryption Keys ====================

  @Get('encryption-keys')
  @UseGuards(AuthGuard('jwt'))
  async listKeys(@Req() req: any) { return this.iso.listKeys(req.user.organizationId); }

  @Post('encryption-keys')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async createKey(@Req() req: any, @Body() body: any) { return this.iso.createKey(req.user.organizationId, body, req.user.id); }

  @Post('encryption-keys/:id/rotate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async rotateKey(@Req() req: any, @Param('id') id: string) { return this.iso.rotateKey(id, req.user.organizationId, req.user.id); }

  @Post('encryption-keys/:id/revoke')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async revokeKey(@Req() req: any, @Param('id') id: string) { return this.iso.revokeKey(id, req.user.organizationId, req.user.id); }

  // ==================== Sensitive Fields ====================

  @Get('sensitive-fields')
  @UseGuards(AuthGuard('jwt'))
  async listSensitiveFields(@Req() req: any) { return this.iso.listSensitiveFields(req.user.organizationId); }

  @Put('sensitive-fields')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async upsertSensitiveField(@Req() req: any, @Body() body: any) { return this.iso.upsertSensitiveField(req.user.organizationId, body); }

  @Delete('sensitive-fields/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async deleteSensitiveField(@Req() req: any, @Param('id') id: string) { return this.iso.deleteSensitiveField(id, req.user.organizationId); }

  // ==================== Dashboard ====================

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboard(@Req() req: any) { return this.iso.getIsoDashboard(req.user.organizationId); }
}
