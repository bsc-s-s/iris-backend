import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] || request.params.orgId || request.query.orgId;

    if (user?.role === 'superadmin') return true;

    if (tenantId && user?.organizationId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    request.organizationId = user?.organizationId;
    return true;
  }
}
