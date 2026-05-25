import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.users.findAll(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body(ValidationPipe) dto: CreateUserDto, @CurrentUser('organizationId') orgId: string) {
    return this.users.create(dto, orgId);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.users.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
