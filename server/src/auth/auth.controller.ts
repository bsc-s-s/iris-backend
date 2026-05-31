import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipZeroTrust } from '../zero-trust/decorators/skip-zero-trust.decorator';
import { Public } from '../zero-trust/decorators/public.decorator';

function isSecure(req: any): boolean {
  return req?.secure || req?.headers?.['x-forwarded-proto'] === 'https';
}

function cookieOpts(req: any, maxAge: number) {
  const prod = process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure: isSecure(req) || prod, sameSite: prod ? ('none' as const) : ('lax' as const), path: '/', maxAge };
}

function setAuthCookies(res: Response, req: any, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('access_token', tokens.accessToken, cookieOpts(req, 15 * 60 * 1000));
  res.cookie('refresh_token', tokens.refreshToken, { ...cookieOpts(req, 7 * 24 * 60 * 60 * 1000), path: '/api/auth' });
  res.cookie('csrf_token', crypto.randomUUID(), { ...cookieOpts(req, 7 * 24 * 60 * 60 * 1000), httpOnly: false });
}

function clearAuthCookies(res: Response, req: any) {
  const prod = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isSecure(req) || prod, sameSite: prod ? ('none' as const) : ('lax' as const) };
  res.clearCookie('access_token', { ...opts, path: '/' });
  res.clearCookie('refresh_token', { ...opts, path: '/api/auth' });
  res.clearCookie('csrf_token', { ...opts, path: '/', httpOnly: false });
}

@ApiTags('Autenticación')
@Controller('auth')
@SkipZeroTrust()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registro público deshabilitado. Use POST /admin/users/create' })
  @ApiResponse({ status: 410, description: 'Registro público deshabilitado' })
  async register(@Body() dto: RegisterDto) {
    return { statusCode: 410, message: 'Registro público deshabilitado. Solo un administrador puede crear usuarios.', ok: false };
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
    @Res({ passthrough: true }) res: Response,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-country') country?: string,
    @Headers('x-mfa-token') mfaToken?: string,
  ) {
    const result = await this.auth.login(dto, {
      ipAddress: req.ip,
      deviceId: deviceId || '',
      userAgent: req.headers['user-agent'] || '',
      country: country || req.headers['cf-ipcountry'] || '',
      mfaToken: mfaToken || undefined,
    });
    setAuthCookies(res, req, result);
    return result;
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
    @Res({ passthrough: true }) res: Response,
    @Headers('x-device-id') deviceId?: string,
    @Headers('x-country') country?: string,
  ) {
    const result = await this.auth.loginStep2({
      userId: body.userId,
      mfaToken: body.mfaToken,
      ipAddress: req.ip,
      deviceId: deviceId || '',
      userAgent: req.headers['user-agent'] || '',
      country: country || req.headers['cf-ipcountry'] || '',
    });
    setAuthCookies(res, req, result);
    return result;
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
    @Res({ passthrough: true }) res: Response,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const refreshToken = dto.refreshToken || req.cookies?.refresh_token;
    const result = await this.auth.refresh(refreshToken, { ipAddress: req.ip, deviceId });
    setAuthCookies(res, req, result);
    return result;
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = req.user?.sessionId;
    await this.auth.logout(userId, sessionId);
    clearAuthCookies(res, req);
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
    if (!full || !full.organization) return { user: null, organization: null };
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

  @Post('sso/session')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set SSO session cookies from tokens' })
  async ssoSession(
    @Body() body: { accessToken: string; refreshToken: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    setAuthCookies(res, req, { accessToken: body.accessToken, refreshToken: body.refreshToken });
    return { ok: true };
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
