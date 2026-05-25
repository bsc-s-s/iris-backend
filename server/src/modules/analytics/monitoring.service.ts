import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger('Monitoring');
  private metrics: Record<string, number> = {};

  increment(metric: string, value = 1) {
    this.metrics[metric] = (this.metrics[metric] || 0) + value;
  }

  gauge(metric: string, value: number) {
    this.metrics[metric] = value;
  }

  getMetrics() {
    return { ...this.metrics, timestamp: new Date().toISOString() };
  }

  log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
    const msg = context ? `${message} ${JSON.stringify(context)}` : message;
    if (level === 'error') this.logger.error(msg);
    else if (level === 'warn') this.logger.warn(msg);
    else this.logger.log(msg);
  }
}
