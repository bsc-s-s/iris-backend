import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MfaService } from './mfa.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('MFA')
@ApiBearerAuth()
@Controller('mfa')
@UseGuards(AuthGuard('jwt'))
export class MfaController {
  constructor(private mfa: MfaService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Iniciar configuración MFA (genera secreto TOTP + recovery codes)' })
  @ApiResponse({ status: 201, description: 'Secreto TOTP, QR URL y 8 códigos de recuperación' })
  async setup(@CurrentUser('id') userId: string) {
    return this.mfa.generateSecret(userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verificar código TOTP y habilitar MFA' })
  @ApiResponse({ status: 201, description: 'MFA verificado y habilitado' })
  async verify(@Body() body: { token: string }, @CurrentUser('id') userId: string) {
    return this.mfa.verifyAndEnable(userId, body.token);
  }

  @Post('disable')
  @ApiOperation({ summary: 'Deshabilitar MFA' })
  @ApiResponse({ status: 200, description: 'MFA deshabilitado' })
  async disable(@CurrentUser('id') userId: string) {
    return this.mfa.disable(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Estado de MFA del usuario' })
  @ApiResponse({ status: 200, description: 'Estado MFA (enabled, hasSecret, recoveryCodesCount)' })
  async status(@CurrentUser('id') userId: string) {
    return this.mfa.status(userId);
  }
}
