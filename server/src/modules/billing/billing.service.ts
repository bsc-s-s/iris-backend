import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

export interface SubscriptionStatus {
  active: boolean;
  plan: Plan | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 29900, currency: 'EUR', interval: 'month', features: ['1 organización', '5 usuarios', '10 evaluaciones/mes', 'API access'] },
  { id: 'professional', name: 'Professional', price: 99900, currency: 'EUR', interval: 'month', features: ['1 organización', '25 usuarios', 'Evaluaciones ilimitadas', 'API v1 + Compliance', 'AI Analyst', 'Soporte prioritario'] },
  { id: 'enterprise', name: 'Enterprise', price: 499900, currency: 'EUR', interval: 'month', features: ['Múltiples organizaciones', 'Usuarios ilimitados', 'Todo incluido', 'SSO / SAML', 'SLA 99.9%', 'On-premise opcional', 'Account manager dedicado'] },
];

@Injectable()
export class BillingService {
  private stripe: any = null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      try { this.stripe = new (require('stripe'))(key); } catch {}
    }
  }

  getPlans(): Plan[] { return PLANS; }

  async createCheckoutSession(orgId: string, planId: string, successUrl: string, cancelUrl: string): Promise<any> {
    if (!this.stripe) throw new HttpException('Stripe no configurado (STRIPE_SECRET_KEY requerida)', HttpStatus.SERVICE_UNAVAILABLE);
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new HttpException('Plan no encontrado', HttpStatus.NOT_FOUND);
    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: plan.currency.toLowerCase(), product_data: { name: `IRIS ${plan.name}` }, unit_amount: plan.price, recurring: { interval: plan.interval } }, quantity: 1 }],
      metadata: { orgId, planId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async handleWebhook(payload: any, signature: string): Promise<any> {
    if (!this.stripe) throw new HttpException('Stripe no configurado', HttpStatus.SERVICE_UNAVAILABLE);
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch {
      throw new HttpException('Webhook signature inválida', HttpStatus.BAD_REQUEST);
    }
    return { received: true, type: event.type };
  }
}
