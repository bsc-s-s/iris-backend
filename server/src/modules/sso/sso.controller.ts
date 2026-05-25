import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Controller, Post, Get, Param, Body, Query, Res, UseGuards, Delete, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('SSO / Single Sign-On')
@Controller('v1/sso')
export class SsoController {
  constructor(private sso: SsoService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Listar proveedores SSO disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de proveedores con tipo e icono' })
  getProviders() {
    return this.sso.getProviders();
  }

  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Obtener configuración SSO de la organización' })
  @ApiResponse({ status: 200, description: 'Configuraciones SSO activas' })
  async getConfig(@CurrentUser('organizationId') orgId: string) {
    return this.sso.getConfig(orgId);
  }

  @Put('config')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Guardar/actualizar configuración SSO de un proveedor' })
  @ApiResponse({ status: 200, description: 'Configuración guardada' })
  async saveConfig(
    @CurrentUser('organizationId') orgId: string,
    @Body() data: {
      provider: string; issuer: string; entryPoint: string;
      certificate?: string; clientId?: string; clientSecret?: string; enabled: boolean;
    },
  ) {
    return this.sso.saveConfig(orgId, data);
  }

  @Delete('config/:provider')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Eliminar configuración SSO de un proveedor' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  async deleteConfig(
    @CurrentUser('organizationId') orgId: string,
    @Param('provider') provider: string,
  ) {
    return this.sso.deleteConfig(orgId, provider);
  }

  @Post('login/:provider')
  @ApiOperation({ summary: 'Iniciar flujo de login SSO (devuelve URL de redirección al IdP)' })
  @ApiParam({ name: 'provider', enum: ['google', 'microsoft', 'oidc', 'saml'] })
  @ApiResponse({ status: 200, description: 'URL de redirección al proveedor IdP' })
  async initiateLogin(
    @Param('provider') provider: string,
    @Query('org') orgSlug?: string,
  ) {
    return this.sso.initiateLogin(provider, orgSlug);
  }

  @Get('callback/:provider')
  @ApiOperation({ summary: 'Callback OIDC — el IdP redirige aquí con code + state' })
  @ApiParam({ name: 'provider', enum: ['google', 'microsoft', 'oidc'] })
  async oidcCallback(
    @Param('provider') provider: string,
    @Query() params: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const result = await this.sso.handleOidcCallback(provider, params);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
    } catch (err: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('callback/saml')
  @ApiOperation({ summary: 'Callback SAML — el IdP envía SAMLResponse vía POST' })
  @HttpCode(HttpStatus.FOUND)
  async samlCallback(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const result = await this.sso.handleSamlCallback(body);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
    } catch (err: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?error=${encodeURIComponent(err.message)}`);
    }
  }
}
