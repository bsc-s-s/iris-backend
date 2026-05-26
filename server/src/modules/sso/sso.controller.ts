import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Controller, Post, Get, Param, Body, Query, Res, Req, UseGuards, Delete, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { SsoService } from './sso.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

function getBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

@ApiTags('SSO / Single Sign-On')
@Controller('v1/sso')
export class SsoController {
  constructor(private sso: SsoService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Listar proveedores SSO disponibles' })
  getProviders() {
    return this.sso.getProviders();
  }

  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Obtener configuración SSO de la organización' })
  async getConfig(@CurrentUser('organizationId') orgId: string) {
    return this.sso.getConfig(orgId);
  }

  @Put('config')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Guardar/actualizar configuración SSO de un proveedor' })
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
  async deleteConfig(
    @CurrentUser('organizationId') orgId: string,
    @Param('provider') provider: string,
  ) {
    return this.sso.deleteConfig(orgId, provider);
  }

  @Post('login/:provider')
  @ApiOperation({ summary: 'Iniciar flujo de login SSO (devuelve URL de redirección al IdP)' })
  @ApiParam({ name: 'provider', enum: ['google', 'microsoft', 'oidc', 'saml'] })
  async initiateLogin(
    @Param('provider') provider: string,
    @Query('org') orgSlug: string | undefined,
    @Req() req: Request,
  ) {
    const baseUrl = getBaseUrl(req);
    return this.sso.initiateLogin(provider, orgSlug, baseUrl);
  }

  @Get('callback/:provider')
  @ApiOperation({ summary: 'Callback OIDC — el IdP redirige aquí con code + state' })
  @ApiParam({ name: 'provider', enum: ['google', 'microsoft', 'oidc'] })
  async oidcCallback(
    @Param('provider') provider: string,
    @Query() params: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const baseUrl = getBaseUrl(req);
      const result = await this.sso.handleOidcCallback(provider, params, baseUrl);
      const frontendUrl = process.env.FRONTEND_URL || `${baseUrl.replace('/api', '')}`;
      return res.redirect(`${frontendUrl}/sso-callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
    } catch (err: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?error=${encodeURIComponent(err.message + ' [' + (err.code || '') + ']')}`);
    }
  }

  @Post('callback/saml')
  @ApiOperation({ summary: 'Callback SAML — el IdP envía SAMLResponse vía POST' })
  @HttpCode(HttpStatus.FOUND)
  async samlCallback(
    @Body() body: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const baseUrl = getBaseUrl(req);
      const result = await this.sso.handleSamlCallback(body, baseUrl);
      const frontendUrl = process.env.FRONTEND_URL || `${baseUrl.replace('/api', '')}`;
      return res.redirect(`${frontendUrl}/sso-callback?token=${result.accessToken}&refresh=${result.refreshToken}`);
    } catch (err: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/sso-callback?error=${encodeURIComponent(err.message)}`);
    }
  }
}
