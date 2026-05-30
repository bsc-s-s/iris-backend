import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

export class SubmitResponseDto {
  @ApiProperty({ example: 'cm123...', description: 'ID de la pregunta (de la tabla Question)' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: { value: 4 }, description: 'Respuesta en formato JSON' })
  @IsObject()
  response: Record<string, any>;
}
