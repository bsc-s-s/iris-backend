import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, data: { name: string; url: string; events: string[]; retryCount?: number; timeout?: number }) {
    const secret = crypto.randomBytes(16).toString('hex');
    return this.prisma.webhookEndpoint.create({
      data: {
        name: data.name,
        url: data.url,
        events: data.events,
        secret,
        retryCount: data.retryCount || 3,
        timeout: data.timeout || 5000,
        organizationId: orgId,
      },
    });
  }

  async list(orgId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(orgId: string, id: string, data: { name?: string; url?: string; events?: string[]; enabled?: boolean }) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.update({ where: { id }, data });
  }

  async delete(orgId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, organizationId: orgId } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async dispatch(event: string, payload: any, orgId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId: orgId, enabled: true, events: { has: event } },
    });

    for (const endpoint of endpoints) {
      await this.prisma.webhookEvent.create({
        data: {
          event,
          payload,
          endpointId: endpoint.id,
          status: 'pending',
          nextRetryAt: new Date(),
        },
      });
    }

    // Fire-and-forget delivery
    for (const endpoint of endpoints) {
      this.deliver(endpoint.id, event, payload).catch(() => {});
    }

    return { dispatched: endpoints.length, event };
  }

  private async deliver(endpointId: string, event: string, payload: any) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint || !endpoint.enabled) return;

    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    let eventRecord = await this.prisma.webhookEvent.findFirst({
      where: { endpointId, event, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (eventRecord) {
        await this.prisma.webhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: response.ok ? 'delivered' : 'failed',
            responseCode: response.status,
            responseBody: await response.text().catch(() => ''),
            attempts: { increment: 1 },
            completedAt: response.ok ? new Date() : undefined,
          },
        });
      }

      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { lastDeliveryAt: new Date(), lastStatus: response.ok ? 'success' : 'failed' },
      });

      // Retry logic
      if (!response.ok && eventRecord && eventRecord.attempts < endpoint.retryCount) {
        const delay = Math.pow(2, eventRecord.attempts) * 10000;
        await this.prisma.webhookEvent.update({
          where: { id: eventRecord.id },
          data: { nextRetryAt: new Date(Date.now() + delay) },
        });
      }
    } catch (error: any) {
      if (eventRecord) {
        await this.prisma.webhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: 'failed',
            responseBody: error.message,
            attempts: { increment: 1 },
          },
        });
      }
    }
  }

  async getEventLog(orgId: string, endpointId?: string) {
    const where: any = { endpoint: { organizationId: orgId } };
    if (endpointId) where.endpointId = endpointId;
    return this.prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
