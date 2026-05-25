import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateAssessmentDto {
  @ApiProperty({ example: 'Evaluación Anual 2026', description: 'Título de la evaluación' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'clx123abc...', description: 'ID de la facility asociada' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ example: 'iris-v4', enum: ['iris-v4', 'iris-v5', 'iso-31000', 'nist'], description: 'Metodología de evaluación' })
  @IsOptional()
  @IsString()
  @IsEnum(['iris-v4', 'iris-v5', 'iso-31000', 'nist'])
  methodology?: string;
}
