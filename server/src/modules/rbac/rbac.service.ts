import { Injectable, ForbiddenException } from '@nestjs/common';
import { Role, Permission, ROLE_HIERARCHY, ROLE_PERMISSIONS } from './rbac.enum';

@Injectable()
export class RbacService {
  userHasRole(userRole: string, requiredRole: Role): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    if (requiredLevel === undefined) return false;
    return userLevel >= requiredLevel;
  }

  userHasPermission(userRole: string, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[userRole as Role];
    if (!permissions) return false;
    return permissions.includes(permission);
  }

  userHasAnyPermission(userRole: string, permissions: Permission[]): boolean {
    return permissions.some(p => this.userHasPermission(userRole, p));
  }

  userHasAllPermissions(userRole: string, permissions: Permission[]): boolean {
    return permissions.every(p => this.userHasPermission(userRole, p));
  }

  requireRole(userRole: string, requiredRole: Role): void {
    if (!this.userHasRole(userRole, requiredRole)) {
      throw new ForbiddenException(`Se requiere rol ${requiredRole}`);
    }
  }

  requirePermission(userRole: string, permission: Permission): void {
    if (!this.userHasPermission(userRole, permission)) {
      throw new ForbiddenException(`Permiso denegado: ${permission}`);
    }
  }

  getRoleLevel(role: string): number {
    return ROLE_HIERARCHY[role as Role] ?? 0;
  }

  getPermissionsForRole(role: string): Permission[] {
    return ROLE_PERMISSIONS[role as Role] ?? [];
  }

  getRolesBelow(role: Role): Role[] {
    const threshold = ROLE_HIERARCHY[role];
    return Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level < threshold)
      .map(([r]) => r as Role);
  }

  getRolesAtOrBelow(role: Role): Role[] {
    const threshold = ROLE_HIERARCHY[role];
    return Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level <= threshold)
      .map(([r]) => r as Role);
  }

  canManageRole(managerRole: string, targetRole: string): boolean {
    const managerLevel = ROLE_HIERARCHY[managerRole as Role] ?? 0;
    const targetLevel = ROLE_HIERARCHY[targetRole as Role] ?? 0;
    return managerLevel > targetLevel;
  }
}
