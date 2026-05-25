import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

export class SubmitResponseDto {
  @ApiProperty({ example: 'q_001', description: 'ID de la pregunta' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 'security_policy', description: 'Clave semántica de la pregunta' })
  @IsString()
  questionKey: string;

  @ApiProperty({ example: { value: 4, evidence: 'Política documentada' }, description: 'Respuesta en formato JSON' })
  @IsObject()
  response: Record<string, any>;
}
