import { Module } from '@nestjs/common';
import { ThinkingEngineService } from './thinking-engine.service';
import { ThinkingEngineController } from './thinking-engine.controller';

@Module({
  controllers: [ThinkingEngineController],
  providers: [ThinkingEngineService],
  exports: [ThinkingEngineService],
})
export class ThinkingEngineModule {}
