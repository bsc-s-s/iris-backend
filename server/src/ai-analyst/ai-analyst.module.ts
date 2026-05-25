import { Module } from '@nestjs/common';
import { AiAnalystController } from './ai-analyst.controller';
import { AiAnalystService } from './ai-analyst.service';

@Module({
  controllers: [AiAnalystController],
  providers: [AiAnalystService],
  exports: [AiAnalystService],
})
export class AiAnalystModule {}
