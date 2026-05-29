import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThinkingEngineService, ThinkingInput } from './thinking-engine.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission } from '../rbac/rbac.enum';

@ApiTags('IRIS Thinking Engine')
@ApiBearerAuth()
@Controller('ai/thinking')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ThinkingEngineController {
  constructor(private engine: ThinkingEngineService) {}

  @Post('analyze')
  @RequirePermissions(Permission.AI_ADVANCED)
  @ApiOperation({ summary: 'Análisis profundo IRIS: detecta contradicciones, riesgos invisibles y señales débiles' })
  async analyze(
    @Body() input: ThinkingInput,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    input.organizationId = orgId;
    input.userId = userId;
    return this.engine.analyze(input);
  }
}
