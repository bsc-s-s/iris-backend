import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceEvaluator } from './compliance.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceEvaluator],
  exports: [ComplianceEvaluator],
})
export class ComplianceModule {}
