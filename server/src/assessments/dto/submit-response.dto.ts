import { IsString, IsObject } from 'class-validator';

export class SubmitResponseDto {
  @IsString()
  questionId: string;

  @IsString()
  questionKey: string;

  @IsObject()
  response: Record<string, any>;
}
