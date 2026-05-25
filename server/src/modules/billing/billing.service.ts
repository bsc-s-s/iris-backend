import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 29900, currency: 'EUR', interval: 'month', features: ['1 organización', '5 usuarios', '10 evaluaciones/mes', 'API access'] },
  { id: 'professional', name: 'Professional', price: 99900, currency: 'EUR', interval: 'month', features: ['1 organización', '25 usuarios', 'Evaluaciones ilimitadas', 'API v1 + Compliance', 'AI Analyst', 'Soporte prioritario'] },
  { id: 'enterprise', name: 'Enterprise', price: 499900, currency: 'EUR', interval: 'month', features: ['Múltiples organizaciones', 'Usuarios ilimitados', 'Todo incluido', 'SSO / SAML', 'SLA 99.9%', 'On-premise opcional', 'Account manager dedicado'] },
];

@Injectable()
export class BillingService {
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly mode: 'sandbox' | 'live';
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || null;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || null;
    this.mode = (process.env.PAYPAL_MODE as any) || 'sandbox';
  }

  get baseUrl() {
    return this.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  getPlans(): Plan[] { return PLANS; }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken!;
    if (!this.clientId || !this.clientSecret) throw new HttpException('PayPal no configurado (PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET requeridos)', HttpStatus.SERVICE_UNAVAILABLE);

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      const err = await res.text();
      throw new HttpException(`PayPal auth error: ${err}`, HttpStatus.BAD_GATEWAY);
    }
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  async createCheckoutSession(orgId: string, planId: string, successUrl: string, cancelUrl: string): Promise<any> {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new HttpException('Plan no encontrado', HttpStatus.NOT_FOUND);

    const token = await this.getAccessToken();
    const unitAmount = (plan.price / 100).toFixed(2);

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: planId,
        description: `IRIS ${plan.name}`,
        amount: { currency_code: plan.currency, value: unitAmount },
        custom_id: orgId,
      }],
      application_context: {
        brand_name: 'IRIS Enterprise',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
    };

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new HttpException(`PayPal error: ${err}`, HttpStatus.BAD_GATEWAY);
    }

    const order = await res.json();
    const approvalUrl = order.links?.find((l: any) => l.rel === 'approve')?.href;

    return {
      orderId: order.id,
      status: order.status,
      url: approvalUrl,
      plan: planId,
      amount: unitAmount,
      currency: plan.currency,
    };
  }

  async captureOrder(orderId: string): Promise<any> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new HttpException(`PayPal capture error: ${err}`, HttpStatus.BAD_GATEWAY);
    }
    return res.json();
  }

  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    const token = await this.getAccessToken();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return { received: true, type: body?.event_type, note: 'webhook_id no configurado' };

    const verification = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });

    if (!verification.ok || (await verification.json()).verification_status !== 'SUCCESS') {
      throw new HttpException('Webhook signature inválida', HttpStatus.BAD_REQUEST);
    }

    return { received: true, type: body.event_type };
  }
}
