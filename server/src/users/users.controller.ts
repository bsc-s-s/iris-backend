import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios de la organización' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.users.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear un nuevo usuario en la organización' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async create(@Body(ValidationPipe) dto: CreateUserDto, @CurrentUser('organizationId') orgId: string) {
    return this.users.create(dto, orgId);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  async remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
