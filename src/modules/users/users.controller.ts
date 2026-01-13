import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UsersService } from './users.service';

class CreateUserDto {
  email: string;
  password: string;
  full_name: string;
  role_id: string;
}

class UpdateUserDto {
  email?: string;
  full_name?: string;
  role_id?: string;
  status?: string;
}

class UpdatePasswordDto {
  newPassword: string;
}

@ApiTags('Users - Gestión de Usuarios')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Obtiene la lista completa de usuarios con sus roles y permisos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          email: { type: 'string', example: 'agent@example.com' },
          full_name: { type: 'string', example: 'Juan Pérez' },
          status: {
            type: 'string',
            enum: ['available', 'busy', 'offline'],
            example: 'available',
          },
          role_id: { type: 'string', example: 'uuid-del-rol' },
          role: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Agente' },
              description: { type: 'string', example: 'Rol para agentes' },
              permissions: {
                type: 'object',
                example: {
                  conversations: { read: true, write: true, delete: false },
                  contacts: { read: true, write: true, delete: false },
                },
              },
            },
          },
        },
      },
    },
  })
  async getUsers() {
    return this.usersService.findAll();
  }

  @Get('agents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar agentes',
    description: 'Obtiene la lista de agentes (requiere autenticación)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de agentes obtenida',
  })
  async getAgents() {
    return this.usersService.findAgents();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene un usuario específico con su rol y permisos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario',
    example: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        email: { type: 'string', example: 'agent@example.com' },
        full_name: { type: 'string', example: 'Juan Pérez' },
        status: { type: 'string', example: 'available' },
        role_id: { type: 'string', example: 'uuid-del-rol' },
        role: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Agente' },
            description: { type: 'string' },
            permissions: {
              type: 'object',
              example: {
                conversations: { read: true, write: true, delete: false },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Registra un nuevo usuario/agente en el sistema (solo admin).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'newagent@example.com' },
        password: { type: 'string', example: 'SecurePass123!' },
        full_name: { type: 'string', example: 'Nuevo Agente' },
        role_id: { type: 'string', example: 'uuid-del-rol' },
      },
      required: ['email', 'password', 'full_name', 'role_id'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - solo admin',
  })
  async createUser(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza los datos de un usuario existente.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'newemail@example.com' },
        full_name: { type: 'string', example: 'Nombre Actualizado' },
        role_id: { type: 'string', example: 'uuid-nuevo-rol' },
        status: {
          type: 'string',
          enum: ['available', 'busy', 'offline'],
          example: 'available',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Put(':id/password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: 'Actualiza la contraseña de un usuario.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', example: 'NewSecurePass123!' },
      },
      required: ['newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  async updatePassword(
    @Param('id') id: string,
    @Body() body: UpdatePasswordDto,
  ) {
    await this.usersService.updatePassword(id, body.newPassword);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema (solo admin).',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.delete(id);
  }
}
