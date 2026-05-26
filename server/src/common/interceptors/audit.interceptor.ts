import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, ip, user } = request;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          if (!user || path.startsWith('/api/auth')) return;

          const sensitivePaths = ['/api/gdpr/export', '/api/gdpr/dpo', '/api/users', '/api/audit', '/api/gdpr/dpia', '/api/enterprise-compliance'];
          const isSensitive = sensitivePaths.some(p => path.startsWith(p));
          const highRiskActions = ['DELETE', 'PUT', 'PATCH'];
          const shouldLog = isSensitive || highRiskActions.includes(method) || method === 'POST';

          if (shouldLog && user.organizationId) {
            this.prisma.auditLog.create({
              data: {
                action: `${method.toLowerCase()}.${path.split('/').pop() || 'unknown'}`,
                entity: path.split('/')[2] || 'unknown',
                entityId: request.params?.id,
                description: `${method} ${path}`,
                ipAddress: ip || request.ip,
                userAgent: request.headers['user-agent']?.substring(0, 255),
                result: 'success',
                userId: user.id,
                organizationId: user.organizationId,
                metadata: { duration: `${duration}ms`, params: request.params, query: Object.keys(request.query).length > 0 ? request.query : undefined },
              },
            }).catch(err => this.logger.error(`Audit log failed: ${err.message}`));
          }
        },
        error: (err) => {
          if (user && user.organizationId) {
            this.prisma.auditLog.create({
              data: {
                action: `${method.toLowerCase()}.${path.split('/').pop() || 'unknown'}`,
                entity: path.split('/')[2] || 'unknown',
                entityId: request.params?.id,
                description: `${method} ${path} - ${err.message?.substring(0, 200)}`,
                ipAddress: ip || request.ip,
                userAgent: request.headers['user-agent']?.substring(0, 255),
                result: 'failure',
                userId: user.id,
                organizationId: user.organizationId,
                metadata: { error: err.message?.substring(0, 500), statusCode: err.status },
              },
            }).catch(e => this.logger.error(`Audit log failed: ${e.message}`));
          }
        },
      }),
    );
  }
}
