import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Headers, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('Facturación')
@Controller('v1/billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planes de suscripción disponibles' })
  @ApiResponse({ status: 200, description: 'Planes: Starter, Professional, Enterprise' })
  getPlans() { return this.billing.getPlans(); }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear orden de suscripción PayPal' })
  @ApiResponse({ status: 201, description: 'URL de aprobación de PayPal' })
  async checkout(@Body() body: { planId: string; successUrl: string; cancelUrl: string }, @CurrentUser('organizationId') orgId: string) {
    return this.billing.createCheckoutSession(orgId, body.planId, body.successUrl, body.cancelUrl);
  }

  @Post('capture')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capturar orden PayPal aprobada' })
  @ApiResponse({ status: 201, description: 'Orden capturada' })
  async capture(@Body() body: { orderId: string }) {
    return this.billing.captureOrder(body.orderId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de PayPal (eventos de suscripción)' })
  @ApiResponse({ status: 200, description: 'Evento recibido' })
  async webhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    return this.billing.handleWebhook(headers, body);
  }
}
