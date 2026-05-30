import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityService } from './security.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Security')
@ApiBearerAuth()
@Controller('security')
@UseGuards(AuthGuard('jwt'))
export class SecurityController {
  constructor(private security: SecurityService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Security dashboard data (super admin only)' })
  async getDashboard(@CurrentUser() user: any) {
    try {
      return await this.security.getDashboard(user);
    } catch {
      return { stats: {}, eventsByType: [], recentEvents: [] };
    }
  }

  @Get('events')
  @ApiOperation({ summary: 'Security events with filtering' })
  async getEvents(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.security.getEvents(user, { type, severity, limit: limit ? parseInt(limit) : 50, offset: offset ? parseInt(offset) : 0 });
  }

  @Get('users')
  @ApiOperation({ summary: 'User risk profiles' })
  async getUserRiskProfiles(@CurrentUser() user: any, @Query('userId') userId?: string) {
    return this.security.getUserRiskProfiles(user, userId);
  }

  @Post('verify-chain')
  @ApiOperation({ summary: 'Verify immutability of audit chain' })
  async verifyChain(@CurrentUser() user: any) {
    return this.security.verifyAuditChain(user);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Active sessions overview' })
  async getActiveSessions(@CurrentUser() user: any) {
    return this.security.getActiveSessions(user);
  }

  @Post('revoke-session')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: any, @Body() body: { sessionId: string }) {
    return this.security.revokeSession(user, body.sessionId);
  }

  @Post('lock-user')
  @ApiOperation({ summary: 'Lock a user account' })
  async lockUser(@CurrentUser() user: any, @Body() body: { userId: string; reason?: string }) {
    return this.security.lockUser(user, body.userId, body.reason);
  }

  @Post('unlock-user')
  @ApiOperation({ summary: 'Unlock a user account' })
  async unlockUser(@CurrentUser() user: any, @Body() body: { userId: string }) {
    return this.security.unlockUser(user, body.userId);
  }
}
