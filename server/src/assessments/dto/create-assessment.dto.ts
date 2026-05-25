import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  facilityId?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['iris-v4', 'iris-v5', 'iso-31000', 'nist'])
  methodology?: string;
}
