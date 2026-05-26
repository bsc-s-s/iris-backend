import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AiAnalystModule } from './ai-analyst/ai-analyst.module';
import { SecurityPlanningModule } from './security-planning/security-planning.module';
import { ThreatSimulationModule } from './threat-simulation/threat-simulation.module';
import { AuditModule } from './audit/audit.module';
import { CoreModule } from './core/core.module';
import { V1Module } from './api/v1/v1.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { BillingModule } from './modules/billing/billing.module';
import { EmailModule } from './modules/email/email.module';
import { SsoModule } from './modules/sso/sso.module';
import { MonitoringService } from './modules/analytics/monitoring.service';
import { MfaModule } from './modules/mfa/mfa.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ApiKeyGuard } from './middlewares/api-key.guard';
import { GdprModule } from './gdpr/gdpr.module';
import { Iso27001Module } from './iso27001/iso27001.module';
import { EnterpriseComplianceModule } from './enterprise-compliance/enterprise-compliance.module';
import { ZeroTrustModule } from './zero-trust/zero-trust.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CoreModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AssessmentsModule,
    AiAnalystModule,
    SecurityPlanningModule,
    ThreatSimulationModule,
    AuditModule,
    V1Module,
    ComplianceModule,
    BillingModule,
    EmailModule,
    SsoModule,
    MfaModule,
    ApiKeysModule,
    WebhooksModule,
    GdprModule,
    Iso27001Module,
    EnterpriseComplianceModule,
    ZeroTrustModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    MonitoringService,
    ApiKeyGuard,
  ],
  exports: [MonitoringService],
})
export class AppModule {}
