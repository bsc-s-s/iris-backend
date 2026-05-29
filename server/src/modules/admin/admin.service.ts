import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { Role, ROLE_HIERARCHY, ROLE_PERMISSIONS } from '../rbac/rbac.enum';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private rbac: RbacService,
  ) {}

  async createUser(dto: CreateUserByAdminDto, adminUser: any, meta?: { ipAddress?: string; userAgent?: string }) {
    const targetOrgId = dto.organizationId || adminUser.organizationId;
    const adminRole = adminUser.role as Role;
    const targetRole = (dto.role || 'analyst') as Role;

    if (!this.rbac.canManageRole(adminRole, targetRole)) {
      throw new ForbiddenException('No tienes permiso para asignar este rol');
    }

    if (dto.organizationId && adminRole !== Role.SUPER_ADMIN && adminRole !== Role.PLATFORM_ADMIN) {
      if (dto.organizationId !== adminUser.organizationId) {
        throw new ForbiddenException('No puedes crear usuarios en otra organización');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const tempPassword = crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        title: dto.title || '',
        role: targetRole,
        organizationId: targetOrgId,
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, title: true, isActive: true, organizationId: true, createdAt: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        description: `Usuario ${user.email} creado por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: targetOrgId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { createdRole: targetRole, method: 'admin_create' },
      },
    });

    return {
      user,
      tempPassword: dto.sendInvitation !== false ? tempPassword : undefined,
      message: dto.sendInvitation !== false
        ? `Usuario creado. Contraseña temporal: ${tempPassword}`
        : 'Usuario creado exitosamente',
    };
  }

  async inviteUser(data: { email: string; name: string; role: string; organizationId?: string }, adminUser: any) {
    const targetRole = data.role as Role;
    const adminRole = adminUser.role as Role;
    const targetOrgId = data.organizationId || adminUser.organizationId;

    if (!this.rbac.canManageRole(adminRole, targetRole)) {
      throw new ForbiddenException('No tienes permiso para invitar con ese rol');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const token = uuid() + '-' + uuid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store invitation as a pending user
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: targetRole,
        organizationId: targetOrgId,
        isActive: false,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_INVITED',
        entity: 'User',
        entityId: user.id,
        description: `Invitación enviada a ${data.email} por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: targetOrgId,
        metadata: { role: targetRole, token, expiresAt: expiresAt.toISOString() },
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'Invitación creada exitosamente',
      invitationLink: `/accept-invitation?token=${token}`,
    };
  }

  async suspendUser(userId: string, adminUser: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const adminRole = adminUser.role as Role;
    if (!this.rbac.canManageRole(adminRole, user.role as Role)) {
      throw new ForbiddenException('No puedes suspender este usuario');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_SUSPENDED',
        entity: 'User',
        entityId: userId,
        description: `Usuario ${user.email} suspendido por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: user.organizationId,
        metadata: { suspendedBy: adminUser.id },
      },
    });

    return { ok: true, message: `Usuario ${user.email} suspendido` };
  }

  async unsuspendUser(userId: string, adminUser: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_UNSUSPENDED',
        entity: 'User',
        entityId: userId,
        description: `Usuario ${user.email} reactivado por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: user.organizationId,
        metadata: { unsuspendedBy: adminUser.id },
      },
    });

    return { ok: true, message: `Usuario ${user.email} reactivado` };
  }

  async resetUserMfa(userId: string, adminUser: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'MFA_RESET',
        entity: 'User',
        entityId: userId,
        description: `MFA reseteado para ${user.email} por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: user.organizationId,
        metadata: { resetBy: adminUser.id },
      },
    });

    return { ok: true, message: `MFA reseteado para ${user.email}` };
  }

  async blockOrganization(orgId: string, adminUser: any) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    await this.prisma.user.updateMany({
      where: { organizationId: orgId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ORG_BLOCKED',
        entity: 'Organization',
        entityId: orgId,
        description: `Organización ${org.name} bloqueada por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: orgId,
        metadata: { blockedBy: adminUser.id },
      },
    });

    return { ok: true, message: `Organización ${org.name} bloqueada` };
  }

  async unblockOrganization(orgId: string, adminUser: any) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    await this.prisma.auditLog.create({
      data: {
        action: 'ORG_UNBLOCKED',
        entity: 'Organization',
        entityId: orgId,
        description: `Organización ${org.name} desbloqueada por ${adminUser.email}`,
        userId: adminUser.id,
        organizationId: orgId,
        metadata: { unblockedBy: adminUser.id },
      },
    });

    return { ok: true, message: `Organización ${org.name} desbloqueada` };
  }

  async listAllUsers(adminUser: any) {
    const adminRole = adminUser.role as Role;
    if (adminRole === Role.SUPER_ADMIN || adminRole === Role.PLATFORM_ADMIN) {
      return this.prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, title: true, isActive: true, lastLoginAt: true, createdAt: true, organizationId: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    }
    return this.prisma.user.findMany({
      where: { organizationId: adminUser.organizationId },
      select: { id: true, email: true, name: true, role: true, title: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listOrganizations(adminUser: any) {
    const adminRole = adminUser.role as Role;
    if (adminRole === Role.SUPER_ADMIN || adminRole === Role.PLATFORM_ADMIN) {
      return this.prisma.organization.findMany({
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    }
    return this.prisma.organization.findUnique({
      where: { id: adminUser.organizationId },
      select: { id: true, name: true, slug: true, plan: true, createdAt: true },
    });
  }
}
