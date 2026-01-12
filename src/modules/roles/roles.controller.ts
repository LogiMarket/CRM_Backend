import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesService } from './roles.service';

@ApiTags('Roles - Gestión de Roles y Permisos')
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar roles',
    description: 'Obtiene todos los roles activos con sus permisos configurados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          name: { type: 'string', example: 'Administrador' },
          description: { type: 'string', example: 'Acceso completo al sistema' },
          permissions: {
            type: 'object',
            example: {
              conversations: { read: true, write: true, delete: true },
              contacts: { read: true, write: true, delete: true },
              users: { read: true, write: true, delete: true },
            },
          },
          is_active: { type: 'boolean', example: true },
        },
      },
    },
  })
  async getRoles() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiOperation({
    summary: 'Obtener rol por ID',
    description: 'Obtiene los detalles completos de un rol específico.',
  })
  async getRoleById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiOperation({
    summary: 'Crear rol',
    description:
      'Crea un nuevo rol con permisos personalizados. Los permisos se configuran por módulo.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Soporte' },
        description: { type: 'string', example: 'Rol para equipo de soporte' },
        permissions: {
          type: 'object',
          example: {
            conversations: { read: true, write: true, delete: false },
            contacts: { read: true, write: true, delete: false },
            users: { read: false, write: false, delete: false },
          },
        },
      },
      required: ['name', 'permissions'],
    },
  })
  async createRole(@Body() body: any) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiOperation({
    summary: 'Actualizar rol',
    description: 'Actualiza los permisos o información de un rol existente.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        permissions: { type: 'object' },
      },
    },
  })
  async updateRole(@Param('id') id: string, @Body() body: any) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', description: 'ID del rol' })
  @ApiOperation({
    summary: 'Eliminar rol',
    description: 'Desactiva un rol (soft delete). Los usuarios con este rol mantendrán su asignación.',
  })
  async deleteRole(@Param('id') id: string) {
    await this.rolesService.delete(id);
    return { success: true, message: 'Rol desactivado' };
  }

  @Post('seed')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Crear roles por defecto',
    description:
      'Crea los roles iniciales: Administrador, Agente, Supervisor y Usuario. Solo si no existen roles.',
  })
  async seedRoles() {
    await this.rolesService.seedDefaultRoles();
    return { success: true, message: 'Roles por defecto creados' };
  }
}
