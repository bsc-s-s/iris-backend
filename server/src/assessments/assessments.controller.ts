import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssessmentsService } from './assessments.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@ApiTags('Evaluaciones')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AssessmentsController {
  constructor(private assessments: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar evaluaciones de la organización' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado (draft, in_progress, completed)' })
  @ApiResponse({ status: 200, description: 'Lista de evaluaciones' })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: string,
  ) {
    return this.assessments.findAll(orgId, status);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Obtener tendencias históricas de scores' })
  @ApiResponse({ status: 200, description: 'Tendencias de evaluación' })
  async getTrends(@CurrentUser('organizationId') orgId: string) {
    return this.assessments.getTrends(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener evaluación por ID' })
  @ApiResponse({ status: 200, description: 'Evaluación encontrada' })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.assessments.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva evaluación' })
  @ApiBody({ type: CreateAssessmentDto })
  @ApiResponse({ status: 201, description: 'Evaluación creada exitosamente' })
  async create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assessments.create(dto, user.id, user.organizationId);
  }

  @Post(':id/responses')
  @ApiOperation({ summary: 'Enviar respuesta a una pregunta de la evaluación' })
  @ApiBody({ type: SubmitResponseDto })
  @ApiResponse({ status: 201, description: 'Respuesta guardada' })
  async submitResponse(@Param('id') id: string, @Body() dto: SubmitResponseDto) {
    return this.assessments.submitResponse(id, dto);
  }

  @Post(':id/calculate')
  @ApiOperation({ summary: 'Calcular scores de una evaluación' })
  @ApiResponse({ status: 200, description: 'Scores calculados' })
  async calculateScores(@Param('id') id: string) {
    return this.assessments.calculateScores(id);
  }

  @Post(':id/plan')
  @ApiOperation({ summary: 'Generar plan de seguridad desde la evaluación' })
  @ApiResponse({ status: 200, description: 'Plan de seguridad generado' })
  async generatePlan(@Param('id') id: string) {
    return this.assessments.generateSecurityPlan(id);
  }

  @Get('facilities/list')
  @ApiOperation({ summary: 'Listar facilities de la organización' })
  @ApiResponse({ status: 200, description: 'Lista de facilities' })
  async getFacilities(@CurrentUser('organizationId') orgId: string) {
    return this.assessments.getFacilities(orgId);
  }

  @Post('facilities')
  @ApiOperation({ summary: 'Crear una nueva facility' })
  @ApiResponse({ status: 201, description: 'Facility creada' })
  async createFacility(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { name: string; type: string; address?: string; country?: string; city?: string },
  ) {
    return this.assessments.createFacility(orgId, body);
  }
}
