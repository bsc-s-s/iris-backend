import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentAnalysisController } from './document-analysis.controller';
import { DocumentAnalysisService } from './document-analysis.service';

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
  ],
  controllers: [DocumentAnalysisController],
  providers: [DocumentAnalysisService],
  exports: [DocumentAnalysisService],
})
export class DocumentAnalysisModule {}
