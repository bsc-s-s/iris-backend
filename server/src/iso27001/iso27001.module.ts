import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { Iso27001Controller } from './iso27001.controller';
import { Iso27001Service } from './iso27001.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [Iso27001Controller],
  providers: [Iso27001Service],
  exports: [Iso27001Service],
})
export class Iso27001Module {}
