import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EnterpriseComplianceController } from './enterprise-compliance.controller';
import { EnterpriseComplianceService } from './enterprise-compliance.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EnterpriseComplianceController],
  providers: [EnterpriseComplianceService],
  exports: [EnterpriseComplianceService],
})
export class EnterpriseComplianceModule {}
