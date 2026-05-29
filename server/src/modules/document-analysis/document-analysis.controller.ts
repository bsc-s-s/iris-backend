import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentAnalysisService } from './document-analysis.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission } from '../rbac/rbac.enum';

@ApiTags('Document Analysis')
@ApiBearerAuth()
@Controller('ai/document-analysis')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DocumentAnalysisController {
  constructor(private service: DocumentAnalysisService) {}

  @Post('analyze')
  @RequirePermissions(Permission.AI_DOCUMENT_ANALYSIS)
  @ApiOperation({ summary: 'Analizar documento en busca de riesgos, entidades e inconsistencias' })
  async analyzeText(
    @Body() body: { name: string; content: string; type?: string },
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.analyze({
      organizationId: orgId,
      userId,
      name: body.name,
      type: body.type || 'txt',
      content: body.content,
    });
  }

  @Post('upload')
  @RequirePermissions(Permission.AI_DOCUMENT_ANALYSIS)
  @ApiOperation({ summary: 'Subir y analizar archivo (PDF, DOCX, TXT)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    const content = file.buffer.toString('utf-8');
    return this.service.analyze({
      organizationId: orgId,
      userId,
      name: file.originalname,
      type: file.mimetype || 'unknown',
      content,
    });
  }
}
