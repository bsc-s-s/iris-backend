import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvisibleRiskEngineService } from './invisible-risk-engine.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission } from '../rbac/rbac.enum';

@ApiTags('IRIS Invisible Risk')
@ApiBearerAuth()
@Controller('ai/invisible-risk')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class InvisibleRiskEngineController {
  constructor(private service: InvisibleRiskEngineService) {}

  @Post('scan')
  @RequirePermissions(Permission.AI_ADVANCED)
  @ApiOperation({ summary: 'Escaneo de riesgos invisibles basado en patrones organizacionales' })
  async scan(@CurrentUser('organizationId') orgId: string) {
    return this.service.scan(orgId);
  }
}
