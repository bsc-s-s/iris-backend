import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ZeroTrustGuard } from './guards/zero-trust.guard';
import { ZeroTrustService } from './zero-trust.service';
import { AnomalyService } from './anomaly/anomaly.service';
import { ImmutableAuditService } from './audit/immutable-audit.service';
import { SecurityController } from './security/security.controller';
import { SecurityService } from './security/security.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SecurityController],
  providers: [
    ZeroTrustService,
    AnomalyService,
    ImmutableAuditService,
    SecurityService,
    { provide: APP_GUARD, useClass: ZeroTrustGuard },
  ],
  exports: [ZeroTrustService, AnomalyService, ImmutableAuditService, SecurityService],
})
export class ZeroTrustModule {}
