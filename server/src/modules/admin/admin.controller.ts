import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Get, Body, Param, UseGuards, ValidationPipe, Req, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission, Role } from '../rbac/rbac.enum';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Post('users/create')
  @RequirePermissions(Permission.USER_CREATE)
  @ApiOperation({ summary: 'Crear usuario en organización (solo admin)' })
  @ApiBody({ type: CreateUserByAdminDto })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async createUser(
    @Body(ValidationPipe) dto: CreateUserByAdminDto,
    @CurrentUser() adminUser: any,
    @Req() req: any,
  ) {
    return this.admin.createUser(dto, adminUser, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  }

  @Post('users/invite')
  @RequirePermissions(Permission.USER_INVITE)
  @ApiOperation({ summary: 'Invitar usuario por email' })
  async inviteUser(
    @Body() body: { email: string; name: string; role: string; organizationId?: string },
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.inviteUser(body, adminUser);
  }

  @Post('users/:id/suspend')
  @RequirePermissions(Permission.USER_SUSPEND)
  @ApiOperation({ summary: 'Suspender usuario' })
  async suspendUser(
    @Param('id') userId: string,
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.suspendUser(userId, adminUser);
  }

  @Post('users/:id/unsuspend')
  @RequirePermissions(Permission.USER_SUSPEND)
  @ApiOperation({ summary: 'Reactivar usuario suspendido' })
  async unsuspendUser(
    @Param('id') userId: string,
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.unsuspendUser(userId, adminUser);
  }

  @Post('users/:id/mfa-reset')
  @RequirePermissions(Permission.USER_MFA_RESET)
  @ApiOperation({ summary: 'Resetear MFA de un usuario' })
  async resetMfa(
    @Param('id') userId: string,
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.resetUserMfa(userId, adminUser);
  }

  @Post('organizations/:id/block')
  @RequirePermissions(Permission.ORG_BLOCK)
  @ApiOperation({ summary: 'Bloquear organización completa' })
  async blockOrganization(
    @Param('id') orgId: string,
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.blockOrganization(orgId, adminUser);
  }

  @Post('organizations/:id/unblock')
  @RequirePermissions(Permission.ORG_BLOCK)
  @ApiOperation({ summary: 'Desbloquear organización' })
  async unblockOrganization(
    @Param('id') orgId: string,
    @CurrentUser() adminUser: any,
  ) {
    return this.admin.unblockOrganization(orgId, adminUser);
  }

  @Get('users')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Listar todos los usuarios (global)' })
  async listAllUsers(@CurrentUser() adminUser: any) {
    return this.admin.listAllUsers(adminUser);
  }

  @Get('organizations')
  @RequirePermissions(Permission.ORG_READ)
  @ApiOperation({ summary: 'Listar todas las organizaciones' })
  async listOrganizations(@CurrentUser() adminUser: any) {
    return this.admin.listOrganizations(adminUser);
  }
}
