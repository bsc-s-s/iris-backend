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

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AssessmentsModule,
    AiAnalystModule,
    SecurityPlanningModule,
    ThreatSimulationModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
