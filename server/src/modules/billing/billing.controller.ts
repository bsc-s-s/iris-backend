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
  @ApiOperation({ summary: 'Crear sesión de checkout Stripe' })
  @ApiResponse({ status: 201, description: 'URL de checkout de Stripe' })
  async checkout(@Body() body: { planId: string; successUrl: string; cancelUrl: string }, @CurrentUser('organizationId') orgId: string) {
    return this.billing.createCheckoutSession(orgId, body.planId, body.successUrl, body.cancelUrl);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de Stripe (eventos de suscripción)' })
  @ApiResponse({ status: 200, description: 'Evento recibido' })
  async webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    const payload = req.rawBody || JSON.stringify(req.body);
    return this.billing.handleWebhook(payload, signature);
  }
}
