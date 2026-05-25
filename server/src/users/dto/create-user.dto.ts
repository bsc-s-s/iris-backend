import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'nuevo@example.com', description: 'Correo electrónico' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'TempPass123', description: 'Contraseña temporal (mín. 6 caracteres)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Carlos López', description: 'Nombre completo' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Analista de Seguridad', description: 'Cargo del usuario' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'analyst', enum: ['admin', 'analyst', 'viewer'], description: 'Rol en el sistema' })
  @IsOptional()
  @IsEnum(['admin', 'analyst', 'viewer'])
  role?: string;
}
