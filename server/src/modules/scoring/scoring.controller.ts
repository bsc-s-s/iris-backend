import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScoringService, ScoreInput } from './scoring.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission } from '../rbac/rbac.enum';

@ApiTags('IRIS Scoring')
@ApiBearerAuth()
@Controller('ai/scoring')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ScoringController {
  constructor(private scoring: ScoringService) {}

  @Post('calculate')
  @RequirePermissions(Permission.AI_ADVANCED)
  @ApiOperation({ summary: 'Calcular scoring multidimensional (Human Risk, Organizational Exposure, Invisible Risk)' })
  async calculate(
    @Body() input: ScoreInput,
    @CurrentUser('organizationId') orgId: string,
    @Query('ai') useAI?: string,
  ) {
    input.organizationId = orgId;
    return this.scoring.calculate(input, useAI !== 'false');
  }
}
