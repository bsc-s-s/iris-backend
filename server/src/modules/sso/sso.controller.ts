import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Body, Get } from '@nestjs/common';
import { SsoService } from './sso.service';

@ApiTags('SSO')
@Controller('v1/sso')
export class SsoController {
  constructor(private sso: SsoService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Listar proveedores SSO disponibles' })
  @ApiResponse({ status: 200, description: 'Lista: saml, oidc, google, microsoft' })
  getProviders() { return this.sso.getProviders(); }

  @Post('callback')
  @ApiOperation({ summary: 'Callback de autenticación SSO' })
  @ApiResponse({ status: 201, description: 'Resultado de validación SSO' })
  async callback(@Body() body: { provider: string; response: any }) {
    return this.sso.validateSsoResponse(body.provider, body.response);
  }
}
