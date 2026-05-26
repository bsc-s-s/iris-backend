import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipZeroTrust } from '../zero-trust/decorators/skip-zero-trust.decorator';
import { Public } from '../zero-trust/decorators/public.decorator';

@ApiTags('Autenticación')
@Controller('auth')
@SkipZeroTrust()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar nueva organización con usuario admin' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Organización y usuario creados exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (2-step: password verification)' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso con MFA si requerido' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o MFA requerido' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-country') country?: string,
    @Headers('x-mfa-token') mfaToken?: string,
  ) {
    return this.auth.login(dto, {
      ipAddress: req.ip,
      deviceId: deviceId || '',
      userAgent: req.headers['user-agent'] || '',
      country: country || req.headers['cf-ipcountry'] || '',
      mfaToken: mfaToken || undefined,
    });
  }

  @Post('login/step1')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paso 1: verificar credenciales, obtener estado MFA' })
  async loginStep1(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-country') country?: string,
  ) {
    return this.auth.loginStep1(dto, {
      ipAddress: req.ip,
      deviceId: deviceId || '',
      userAgent: req.headers['user-agent'] || '',
      country: country || req.headers['cf-ipcountry'] || '',
    });
  }

  @Post('login/step2')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paso 2: verificar código MFA y completar login' })
  async loginStep2(
    @Body() body: { userId: string; mfaToken: string },
    @Req() req: any,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-country') country?: string,
  ) {
    return this.auth.loginStep2({
      userId: body.userId,
      mfaToken: body.mfaToken,
      ipAddress: req.ip,
      deviceId: deviceId || '',
      userAgent: req.headers['user-agent'] || '',
      country: country || req.headers['cf-ipcountry'] || '',
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Nuevo access token generado' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.auth.refresh(dto.refreshToken, { ipAddress: req.ip, deviceId });
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión (invalida refresh tokens y sesión activa)' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const sessionId = req.user?.sessionId;
    await this.auth.logout(userId, sessionId);
    return { ok: true };
  }

  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario y organización' })
  async me(@CurrentUser() user: any) {
    const full = await this.auth.validateUser(user.id);
    if (!full) return { user: null, organization: null };
    return {
      user: {
        id: full.id, email: full.email, name: full.name,
        role: full.role, title: full.title,
        mfaEnabled: full.mfaEnabled, securityLevel: full.securityLevel,
      },
      organization: {
        id: full.organization.id, name: full.organization.name,
        slug: full.organization.slug, plan: full.organization.plan,
      },
    };
  }

  // MFA endpoints (within auth controller for convenience)
  @Post('mfa/setup')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar configuración MFA' })
  async setupMfa(@CurrentUser('id') userId: string) {
    return this.auth.setupMfa(userId);
  }

  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar código MFA y habilitar' })
  async verifyMfa(@CurrentUser('id') userId: string, @Body() body: { token: string }) {
    return this.auth.verifyMfa(userId, body.token);
  }

  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deshabilitar MFA' })
  async disableMfa(@CurrentUser('id') userId: string) {
    return this.auth.disableMfa(userId);
  }

  @Post('mfa/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado de MFA' })
  async mfaStatus(@CurrentUser('id') userId: string) {
    return this.auth.getMfaStatus(userId);
  }
}
