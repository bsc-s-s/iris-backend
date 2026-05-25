import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  organizationName: string;

  @IsOptional()
  @IsString()
  @IsEnum(['admin', 'architect', 'analyst', 'viewer'])
  role?: string;
}
