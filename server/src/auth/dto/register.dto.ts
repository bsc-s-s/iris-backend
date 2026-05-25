import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Correo electrónico del nuevo usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MiPassword123', description: 'Contraseña (mín. 6 caracteres)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del usuario' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Mi Empresa SAC', description: 'Nombre de la organización' })
  @IsString()
  organizationName: string;

  @ApiPropertyOptional({ example: 'analyst', enum: ['admin', 'architect', 'analyst', 'viewer'], description: 'Rol del usuario' })
  @IsOptional()
  @IsString()
  @IsEnum(['admin', 'architect', 'analyst', 'viewer'])
  role?: string;
}
