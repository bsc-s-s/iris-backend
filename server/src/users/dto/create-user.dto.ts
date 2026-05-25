import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['admin', 'analyst', 'viewer'])
  role?: string;
}
