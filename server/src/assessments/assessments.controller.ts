import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssessmentsService } from './assessments.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Controller('assessments')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AssessmentsController {
  constructor(private assessments: AssessmentsService) {}

  @Get()
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: string,
  ) {
    return this.assessments.findAll(orgId, status);
  }

  @Get('trends')
  async getTrends(@CurrentUser('organizationId') orgId: string) {
    return this.assessments.getTrends(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assessments.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assessments.create(dto, user.id, user.organizationId);
  }

  @Post(':id/responses')
  async submitResponse(@Param('id') id: string, @Body() dto: SubmitResponseDto) {
    return this.assessments.submitResponse(id, dto);
  }

  @Post(':id/calculate')
  async calculateScores(@Param('id') id: string) {
    return this.assessments.calculateScores(id);
  }

  @Post(':id/plan')
  async generatePlan(@Param('id') id: string) {
    return this.assessments.generateSecurityPlan(id);
  }

  @Get('facilities/list')
  async getFacilities(@CurrentUser('organizationId') orgId: string) {
    return this.assessments.getFacilities(orgId);
  }

  @Post('facilities')
  async createFacility(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { name: string; type: string; address?: string; country?: string; city?: string },
  ) {
    return this.assessments.createFacility(orgId, body);
  }
}
